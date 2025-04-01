import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage, upload } from "./storage";
import { insertEventSchema, insertRegistrationSchema } from "@shared/schema";
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
      // Process the data before validation to ensure proper formats
      let bodyToValidate = { 
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
        bodyToValidate.images.push(...imageUrls);
      }

      // Handle image URLs from the request
      if (req.body.images) {
        const urlImages = Array.isArray(req.body.images)
          ? req.body.images
          : [req.body.images];
        // Accept all valid image URLs
        bodyToValidate.images.push(...urlImages);
      }

      const parsed = insertEventSchema.safeParse(bodyToValidate);
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
    
    // Calculate correct spotsLeft for each event based on current registrations
    for (const event of events) {
      const registrations = await storage.getEventRegistrations(event.id);
      // Update spotsLeft: capacity minus registrations, with minimum of 0
      event.spotsLeft = Math.max(0, event.capacity - registrations.length);
    }
    
    res.json(events);
  });

  app.get("/api/events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);
    
    // Calculate correct spotsLeft for this event based on current registrations
    const registrations = await storage.getEventRegistrations(event.id);
    event.spotsLeft = Math.max(0, event.capacity - registrations.length);
    
    res.json(event);
  });

  app.patch("/api/events/:id", upload.array("images"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const event = await storage.getEvent(Number(req.params.id));
    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    // Log the raw request body for debugging
    log(`Raw update data received: ${JSON.stringify(req.body)}`, "routes");

    // Process the data before validation to ensure images are in the right format
    let bodyToValidate = { ...req.body };
    
    // Ensure images field is an array before validation
    if (bodyToValidate.images) {
      // If images is a string, convert it to an array
      if (typeof bodyToValidate.images === 'string') {
        bodyToValidate.images = [bodyToValidate.images];
      }
    } else {
      bodyToValidate.images = [];
    }
    
    // Convert price and capacity to numbers if they're strings
    if (bodyToValidate.price && typeof bodyToValidate.price === 'string') {
      bodyToValidate.price = parseInt(bodyToValidate.price, 10);
    }
    
    if (bodyToValidate.capacity && typeof bodyToValidate.capacity === 'string') {
      bodyToValidate.capacity = parseInt(bodyToValidate.capacity, 10);
    }

    const parsed = insertEventSchema.partial().safeParse(bodyToValidate);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    const uploadedFiles = req.files as Express.Multer.File[];
    let imageUrls = parsed.data.images || [];
    
    // Add uploaded files
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

  // Registration routes
  app.post("/api/events/:eventId/registrations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const eventId = parseInt(req.params.eventId, 10);
    const event = await storage.getEvent(eventId);

    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    const parsed = insertRegistrationSchema.safeParse({
      ...req.body,
      eventId,
    });

    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }

    try {
      // Generate QR code data for the registration (using name and email as identifier)
      const qrData = { 
        name: parsed.data.name,
        email: parsed.data.email,
        eventId,
        timestamp: new Date().toISOString()
      };
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      
      // Create the registration with the QR code
      const registration = await storage.createRegistration(parsed.data, qrCode);
      
      // Update the event's spots left
      // We don't need to manually update spotsLeft in the database
      // because it will be recalculated in real-time when the event is fetched
      
      res.status(201).json(registration);
    } catch (error) {
      log(`Error creating registration: ${error}`, "routes");
      res.status(500).json({ error: "Failed to create registration" });
    }
  });

  app.get("/api/events/:eventId/registrations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const eventId = parseInt(req.params.eventId, 10);
    const event = await storage.getEvent(eventId);

    if (!event) return res.sendStatus(404);
    if (event.createdBy !== req.user.id) return res.sendStatus(403);

    const registrations = await storage.getEventRegistrations(eventId);
    res.json(registrations);
  });

  app.post("/api/registrations/check-in", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { qrCode, eventId } = req.body;
    if (!qrCode || !eventId) {
      return res.status(400).json({ error: "QR code and event ID are required" });
    }

    try {
      // Log the received QR code for debugging
      log(`Received QR code for check-in: ${qrCode.substring(0, 50)}...`, "routes");
      
      // The QR code might be in different formats:
      // 1. A full data URL (starts with data:image)
      // 2. A JSON string containing registration data
      // 3. Plain text

      let actualQrCode = qrCode;
      
      // If the qrCode is a JSON string, try to parse and extract the original QR code
      if (typeof qrCode === 'string' && !qrCode.startsWith('data:image')) {
        try {
          // Try to parse the QR code as JSON
          const parsedData = JSON.parse(qrCode);
          log(`QR code parsed as JSON: ${JSON.stringify(parsedData)}`, "routes");
          
          // Stringify it again to match how it's stored in the database
          actualQrCode = qrCode;
        } catch (e) {
          // Not valid JSON, use as is
          log(`QR code is not valid JSON, using as is`, "routes");
        }
      }
      
      // Attempt to find the registration by the QR code
      const registration = await storage.getRegistrationByQrCode(actualQrCode);
      
      if (!registration) {
        log(`No registration found for QR code`, "routes");
        return res.status(400).json({ error: "Invalid QR code" });
      }

      // Verify this registration is for this event
      if (registration.eventId !== parseInt(eventId)) {
        return res.status(400).json({ error: "This registration is for a different event" });
      }

      // Verify the user has access to this event
      const event = await storage.getEvent(registration.eventId);
      if (!event || event.createdBy !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized to check in registrations for this event" });
      }

      if (!registration.qrCode) {
        return res.status(400).json({ error: "Invalid QR code" });
      }
      
      const updatedRegistration = await storage.checkInRegistration(registration.qrCode);
      log(`Successfully checked in registration ${updatedRegistration.id}`, "routes");
      res.json(updatedRegistration);
    } catch (error) {
      log(`Check-in error: ${error}`, "routes");
      res.status(400).json({ error: "Invalid registration information" });
    }
  });

  app.get("/api/registrations/:qrCode/qr", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const qrCode = await QRCode.toDataURL(req.params.qrCode);
      res.json({ qrCode });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}