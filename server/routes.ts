import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, upload } from "./storage";
import { insertEventSchema, insertAttendeeSchema } from "@shared/schema";
import { log } from "./vite";
import fetch from "node-fetch";
import QRCode from "qrcode";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Unsplash image suggestions
  app.get("/api/images/suggestions", async (req, res) => {
    try {
      const { query } = req.query;
      log(`Fetching image suggestions for query: ${query}`, "routes");

      if (!query) {
        log(`Missing query parameter`, "routes");
        return res.status(400).json({ error: "Query parameter is required" });
      }

      log(`Making Unsplash API request with key: ${process.env.UNSPLASH_ACCESS_KEY?.slice(0, 4)}...`, "routes");
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          query as string
        )}&per_page=6`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok) {
        log(`Unsplash API error: ${response.statusText}`, "routes");
        throw new Error(`Unsplash API error: ${response.statusText}`);
      }

      interface UnsplashPhoto {
        urls: { regular: string; thumb: string; };
        user: { name: string; links: { html: string; } };
      }
      
      interface UnsplashResponse {
        results: UnsplashPhoto[];
      }
      
      const data = await response.json() as UnsplashResponse;
      
      const images = data.results.map((photo: UnsplashPhoto) => ({
        url: photo.urls.regular,
        thumb: photo.urls.thumb,
        credit: {
          name: photo.user.name,
          link: photo.user.links.html,
        },
      }));

      log(`Found ${images.length} images for query: ${query}`, "routes");
      res.json(images);
    } catch (error) {
      log(`Error fetching Unsplash images: ${error}`, "routes");
      res.status(500).json({ error: "Failed to fetch image suggestions" });
    }
  });

  // Event routes
  app.post("/api/events", upload.array("images"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Parse the request body
      const body = {
        ...req.body,
        price: parseInt(req.body.price),
        capacity: parseInt(req.body.capacity),
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        images: [] as string[],
      };

      // Handle uploaded files
      const uploadedFiles = req.files as Express.Multer.File[];
      if (uploadedFiles?.length) {
        const imageUrls = await storage.uploadEventImages(uploadedFiles);
        body.images.push(...imageUrls);
      }

      // Handle image URLs from the request
      if (req.body.images) {
        const urlImages = Array.isArray(req.body.images)
          ? req.body.images
          : [req.body.images];
        body.images.push(...urlImages.filter((url: string) => url.startsWith('http')));
      }

      const parsed = insertEventSchema.safeParse(body);
      if (!parsed.success) {
        return res.status(400).json(parsed.error);
      }

      const event = await storage.createEvent({
        ...parsed.data,
        createdBy: req.user.id,
      });

      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.get("/api/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    log(`Fetching events for user ID: ${req.user.id}`, "routes");
    const events = await storage.getEventsByUser(req.user.id);
    
    // Calculate correct spotsLeft for each event based on current attendees
    for (const event of events) {
      const attendees = await storage.getEventAttendees(event.id);
      // Update spotsLeft: capacity minus attendees, with minimum of 0
      event.spotsLeft = Math.max(0, event.capacity - attendees.length);
    }
    
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);
    
    // Calculate correct spotsLeft for this event based on current attendees
    const attendees = await storage.getEventAttendees(event.id);
    event.spotsLeft = Math.max(0, event.capacity - attendees.length);
    
    res.json(event);
  });

  app.patch("/api/events/:id", upload.array("images"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    // Log the raw request body for debugging
    log(`Raw update data received: ${JSON.stringify(req.body)}`, "routes");

    const parsed = insertEventSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const uploadedFiles = req.files as Express.Multer.File[];
    let imageUrls = parsed.data.images || [];
    if (uploadedFiles?.length) {
      const newImageUrls = await storage.uploadEventImages(uploadedFiles);
      imageUrls = [...imageUrls, ...newImageUrls];
    }

    const updated = await storage.updateEvent(Number(req.params.id), {
      ...parsed.data,
      images: imageUrls,
    });
    res.json(updated);
  });

  app.delete("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    await storage.deleteEvent(Number(req.params.id));
    res.sendStatus(200);
  });

  // Attendee routes
  app.post("/api/events/:eventId/attendees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const eventId = parseInt(req.params.eventId, 10);
    const event = await storage.getEvent(eventId);

    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    const parsed = insertAttendeeSchema.safeParse({
      ...req.body,
      eventId,
    });

    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      // Generate QR code data for the attendee (using name and email as identifier)
      const qrData = { 
        name: parsed.data.name,
        email: parsed.data.email,
        eventId,
        timestamp: new Date().toISOString()
      };
      const qrCodeData = await QRCode.toDataURL(JSON.stringify(qrData));
      
      // Create the attendee with the QR code data
      const attendee = await storage.createAttendee(parsed.data, qrCodeData);
      
      // Update the event's spots left
      // We don't need to manually update spotsLeft in the database
      // because it will be recalculated in real-time when the event is fetched
      
      res.status(201).json(attendee);
    } catch (error) {
      log(`Error creating attendee: ${error}`, "routes");
      res.status(500).json({ error: "Failed to create attendee" });
    }
  });

  app.get("/api/events/:eventId/attendees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const eventId = parseInt(req.params.eventId, 10);
    const event = await storage.getEvent(eventId);

    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    const attendees = await storage.getEventAttendees(eventId);
    res.json(attendees);
  });

  app.post("/api/attendees/check-in", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { ticketCode, qrCodeData, eventId } = req.body;
    if ((!ticketCode && !qrCodeData) || !eventId) {
      return res.status(400).json({ error: "Either ticket code or QR code data, and event ID are required" });
    }

    try {
      let attendee;
      
      // First try to find attendee by ticket code
      if (ticketCode) {
        attendee = await storage.getAttendeeByTicketCode(ticketCode);
      }
      
      // If not found and we have QR code data, try that
      if (!attendee && qrCodeData) {
        attendee = await storage.getAttendeeByQrCodeData(qrCodeData);
      }
      
      if (!attendee) {
        return res.status(400).json({ error: "Invalid ticket code or QR code" });
      }

      // Verify this ticket is for this event
      if (attendee.eventId !== parseInt(eventId)) {
        return res.status(400).json({ error: "This ticket is for a different event" });
      }

      // Verify the user has access to this event
      const event = await storage.getEvent(attendee.eventId);
      if (!event || event.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized to check in attendees for this event" });
      }

      const updatedAttendee = await storage.checkInAttendee(attendee.ticketCode);
      res.json(updatedAttendee);
    } catch (error) {
      log(`Check-in error: ${error}`, "routes");
      res.status(400).json({ error: "Invalid ticket information" });
    }
  });

  app.get("/api/attendees/:ticketCode/qr", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const qrCode = await QRCode.toDataURL(req.params.ticketCode);
      res.json({ qrCode });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}