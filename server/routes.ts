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
      return res.status(400).json({ 
        error: "QR code and event ID are required",
        debug: { received: { qrCode: qrCode ? `(${typeof qrCode}) ${qrCode.slice(0, 20)}...` : "missing", eventId } }
      });
    }

    log(`================================`, "routes");
    log(`Check-in request received:`, "routes");
    log(`QR code: ${qrCode}`, "routes");
    log(`Event ID: ${eventId}`, "routes");
    log(`QR code type: ${typeof qrCode}`, "routes");
    log(`QR code length: ${qrCode.length}`, "routes");
    log(`================================`, "routes");

    // Store debugging info that will be returned in case of error
    const debugInfo = {
      original: {
        qrCode: qrCode ? `(${typeof qrCode}) ${qrCode.slice(0, 50)}${qrCode.length > 50 ? '...' : ''}` : undefined,
        eventId: eventId,
        dataType: typeof qrCode,
        length: qrCode?.length || 0
      },
      processing: []
    };

    try {
      // Verify the user has access to this event
      const event = await storage.getEvent(parseInt(eventId));
      if (!event) {
        log(`Event ${eventId} not found`, "routes");
        return res.status(404).json({ 
          error: "Event not found", 
          debug: { eventId, ...debugInfo }
        });
      }
      
      if (event.createdBy !== req.user.id) {
        log(`User ${req.user.id} not authorized for event ${eventId}`, "routes");
        return res.status(403).json({ 
          error: "Unauthorized to check in registrations for this event",
          debug: { userId: req.user.id, eventCreator: event.createdBy, ...debugInfo }
        });
      }

      // Handle special test codes for demonstration purposes
      // These are the codes we provided in the client for testing
      if (qrCode.startsWith("REG-EVENT") || qrCode.startsWith("EVENT") || qrCode.startsWith("QRCODE-TEST")) {
        log(`Using test QR code: ${qrCode}`, "routes");
        debugInfo.processing.push({ step: 'test_code_detected', value: qrCode });
        
        // For testing, create a fake registration or use an existing one
        // First try to find if there's an existing registration with this code
        let registration = await storage.getRegistrationByQrCode(qrCode);
        
        if (!registration) {
          // Create a test registration if none exists
          log(`Creating test registration for code: ${qrCode}`, "routes");
          debugInfo.processing.push({ step: 'creating_test_registration', code: qrCode });
          registration = await storage.createRegistration({
            eventId: parseInt(eventId),
            name: `Test User (${qrCode})`,
            email: "test@example.gov",
            phone: "555-555-5555",
            participants: 1,
            qrCode: qrCode
          }, qrCode);
        } else {
          debugInfo.processing.push({ 
            step: 'found_existing_test_registration', 
            registrationId: registration.id,
            eventId: registration.eventId
          });
        }
        
        // Perform the check-in for this test registration
        const updatedRegistration = await storage.checkInRegistration(qrCode);
        log(`Successfully checked in test registration ${updatedRegistration.id}`, "routes");
        return res.json(updatedRegistration);
      }
      
      // Normal QR code processing for real data
      let actualQrCode = qrCode;
      
      // First, try to extract URL from QR code (common with QR scanner libraries)
      // Some QR scanners return URLs like "https://example.com/?data=ABC123"
      debugInfo.processing.push({ step: 'checking_if_url', isUrl: qrCode.startsWith('http') });
      try {
        if (qrCode.startsWith('http')) {
          const url = new URL(qrCode);
          const urlData = url.searchParams.get('data') || url.searchParams.get('code');
          if (urlData) {
            log(`Extracted data from URL: ${urlData}`, "routes");
            actualQrCode = urlData;
            debugInfo.processing.push({ 
              step: 'extracted_from_url', 
              originalUrl: qrCode, 
              extractedData: urlData 
            });
          }
        }
      } catch (e: any) {
        log(`Not a valid URL: ${e.message}`, "routes");
        debugInfo.processing.push({ step: 'url_extraction_failed', error: e.message });
      }
      
      // Check if the QR code is a JSON string
      const isJsonLike = typeof actualQrCode === 'string' && 
        ((actualQrCode.trim().startsWith('{') && actualQrCode.trim().endsWith('}')) || 
        (actualQrCode.trim().startsWith('[') && actualQrCode.trim().endsWith(']')));
      
      debugInfo.processing.push({ 
        step: 'checking_if_json', 
        appearsToBeJson: isJsonLike,
        code: actualQrCode.slice(0, 30) + (actualQrCode.length > 30 ? '...' : '')
      });

      if (isJsonLike) {
        try {
          // Try to parse as JSON object
          const parsedData = JSON.parse(actualQrCode);
          log(`QR code parsed as JSON: ${JSON.stringify(parsedData)}`, "routes");
          debugInfo.processing.push({ 
            step: 'parsed_as_json', 
            parsedKeys: Object.keys(parsedData),
            hasEventId: !!parsedData.eventId,
            hasEmail: !!parsedData.email,
            hasName: !!parsedData.name
          });
          
          // Handle special case where the JSON contains event and user information
          if (parsedData.eventId && (parsedData.email || parsedData.name)) {
            // Verify this data is for the correct event
            if (parsedData.eventId !== parseInt(eventId)) {
              debugInfo.processing.push({ 
                step: 'event_id_mismatch', 
                parsedEventId: parsedData.eventId, 
                requestEventId: eventId 
              });
              return res.status(400).json({ 
                error: "This QR code is for a different event",
                debug: { ...debugInfo, parsedEventId: parsedData.eventId, requestEventId: eventId }
              });
            }
            
            // Look for a registration matching this email and event
            const registrations = await storage.getEventRegistrations(parseInt(eventId));
            debugInfo.processing.push({ 
              step: 'searching_registrations', 
              eventId: parseInt(eventId),
              registrationsFound: registrations.length
            });

            const matchingReg = registrations.find(r => 
              r.email === parsedData.email || 
              (parsedData.name && r.name === parsedData.name)
            );
            
            if (matchingReg) {
              actualQrCode = matchingReg.qrCode;
              log(`Found matching registration by email/name: ${matchingReg.id}`, "routes");
              debugInfo.processing.push({ 
                step: 'found_matching_registration',
                matchBy: parsedData.email ? 'email' : 'name',
                value: parsedData.email || parsedData.name,
                registrationId: matchingReg.id
              });
            } else {
              log(`No matching registration found for parsed data`, "routes");
              debugInfo.processing.push({ 
                step: 'no_matching_registration_found',
                searchEmail: parsedData.email,
                searchName: parsedData.name
              });
            }
          }
        } catch (e: any) {
          log(`Failed to parse QR code as JSON: ${e.message}`, "routes");
          debugInfo.processing.push({ 
            step: 'json_parse_error', 
            error: e.message,
            raw: actualQrCode
          });
          // Not JSON, use the raw string
        }
      }
      
      // Check if the QR code is just a numeric ID (common with simpler QR systems)
      if (/^\d+$/.test(actualQrCode)) {
        log(`QR code appears to be a numeric ID: ${actualQrCode}`, "routes");
        debugInfo.processing.push({ step: 'numeric_id_detected', value: actualQrCode });
        
        // Look for a registration with this ID in the current event
        const registrations = await storage.getEventRegistrations(parseInt(eventId));
        const matchingReg = registrations.find(r => r.id === parseInt(actualQrCode));
        
        if (matchingReg) {
          log(`Found registration by ID: ${matchingReg.id}`, "routes");
          actualQrCode = matchingReg.qrCode || actualQrCode;
          debugInfo.processing.push({ 
            step: 'found_registration_by_id', 
            registrationId: matchingReg.id,
            hasQrCode: !!matchingReg.qrCode
          });
        } else {
          debugInfo.processing.push({ 
            step: 'no_registration_with_id', 
            searchId: parseInt(actualQrCode),
            eventId: parseInt(eventId)
          });
        }
      }
      
      // Find the registration by QR code
      const registration = await storage.getRegistrationByQrCode(actualQrCode);
      
      if (!registration) {
        log(`No registration found for QR code`, "routes");
        
        // Let's get all registrations for this event to help with debugging
        const allEventRegs = await storage.getEventRegistrations(parseInt(eventId));
        const regQrCodes = allEventRegs.map(r => ({
          id: r.id,
          qrCode: r.qrCode ? `${r.qrCode.slice(0, 20)}...` : null,
          email: r.email,
          name: r.name
        }));
        
        debugInfo.processing.push({ 
          step: 'lookup_failed', 
          qrCode: actualQrCode.slice(0, 30) + (actualQrCode.length > 30 ? '...' : '')
        });
        
        return res.status(400).json({ 
          error: "Invalid QR code - no matching registration found", 
          debug: { 
            ...debugInfo,
            qrCode: actualQrCode.slice(0, 50) + (actualQrCode.length > 50 ? '...' : ''),
            knownRegistrations: regQrCodes.slice(0, 5), // Only show first 5 for brevity
            totalRegistrations: allEventRegs.length
          } 
        });
      }

      // Store registration data for debug info
      debugInfo.registration = {
        id: registration.id,
        eventId: registration.eventId,
        email: registration.email,
        name: registration.name,
        qrCode: registration.qrCode ? 
          `${registration.qrCode.slice(0, 20)}...` : null,
        alreadyCheckedIn: !!registration.checkedIn,
        checkedInAt: registration.checkedInAt
      };

      // Verify this registration is for this event
      if (registration.eventId !== parseInt(eventId)) {
        log(`Registration event mismatch: ${registration.eventId} vs ${eventId}`, "routes");
        debugInfo.processing.push({ 
          step: 'event_mismatch', 
          registrationEventId: registration.eventId, 
          requestEventId: parseInt(eventId)
        });
        
        return res.status(400).json({ 
          error: "This registration is for a different event",
          debug: { 
            ...debugInfo,
            registrationEventId: registration.eventId, 
            requestEventId: eventId 
          }
        });
      }

      // Add final summary of what we're doing
      debugInfo.processing.push({
        step: 'final_check_in_status',
        registrationId: registration.id,
        eventId: registration.eventId,
        alreadyCheckedIn: !!registration.checkedIn
      });

      // Process the check-in
      // Make sure qrCode exists
      if (registration.qrCode) {
        const updatedRegistration = await storage.checkInRegistration(registration.qrCode);
        log(`Successfully checked in registration ${updatedRegistration.id}`, "routes");
        res.json(updatedRegistration);
      } else {
        throw new Error("Registration has no QR code");
      }
    } catch (error: any) {
      log(`Check-in error: ${error}`, "routes");
      return res.status(400).json({ 
        error: "Failed to process check-in",
        debug: { 
          ...debugInfo,
          error: {
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5) // Only include first 5 lines of stack trace
          }
        }
      });
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