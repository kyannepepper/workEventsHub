import { User, Event, InsertUser, InsertEvent, users, events, Registration, InsertRegistration, registrations } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { log } from "./vite";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from 'crypto';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: function (_req: Express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (_req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createEvent(event: InsertEvent & { createdBy: number }): Promise<Event>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByUser(userId: number): Promise<Event[]>;
  updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  uploadEventImages(files: Express.Multer.File[]): Promise<string[]>;
  sessionStore: session.Store;
  // Registration methods
  createRegistration(registration: InsertRegistration, qrCode?: string): Promise<Registration>;
  getEventRegistrations(eventId: number): Promise<Registration[]>;
  checkInRegistration(qrCode: string): Promise<Registration>;
  getRegistrationByQrCode(qrCode: string): Promise<Registration | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    log(`Getting user ${id}`, "storage");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    log(`User ${id} ${user ? 'found' : 'not found'}`, "storage");
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    log(`Getting user by username ${username}`, "storage");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    log(`User ${username} ${user ? 'found' : 'not found'}`, "storage");
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    log(`Creating user with username ${insertUser.username}`, "storage");
    const [user] = await db.insert(users).values(insertUser).returning();
    log(`Created user ${user.id}`, "storage");
    return user;
  }

  async createEvent(event: InsertEvent & { createdBy: number }): Promise<Event> {
    log(`Creating event for user ${event.createdBy}`, "storage");

    // Set spots left initially equal to capacity
    const [newEvent] = await db.insert(events).values({
      ...event,
      date: event.startTime,
      spotsLeft: event.capacity,
    }).returning();

    log(`Created event ${newEvent.id} with values: price=${newEvent.price}, capacity=${newEvent.capacity}`, "storage");

    return newEvent;
  }

  async getEvent(id: number): Promise<Event | undefined> {
    log(`Getting event ${id}`, "storage");
    const [event] = await db.select().from(events).where(eq(events.id, id));
    log(`Event ${id} ${event ? 'found' : 'not found'}`, "storage");
    return event;
  }

  async getEventsByUser(userId: number): Promise<Event[]> {
    log(`Getting events for user ${userId}`, "storage");
    const userEvents = await db
      .select()
      .from(events)
      .where(eq(events.createdBy, userId));
    log(`Found ${userEvents.length} events for user ${userId}. Events:`, "storage");
    userEvents.forEach(event => {
      log(`Event ID: ${event.id}, Title: ${event.title}, CreatedBy: ${event.createdBy}`, "storage");
    });
    return userEvents;
  }

  async updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event> {
    log(`Updating event ${id}`, "storage");
    log(`Update payload for event ${id}`, "storage");

    const [updatedEvent] = await db
      .update(events)
      .set(eventUpdate)
      .where(eq(events.id, id))
      .returning();

    log(`Updated event ${id}`, "storage");
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    log(`Deleting event ${id}`, "storage");
    await db.delete(events).where(eq(events.id, id));
    log(`Deleted event ${id}`, "storage");
  }

  async uploadEventImages(files: Express.Multer.File[]): Promise<string[]> {
    log(`Uploading ${files.length} images`, "storage");
    const urls = files.map(file => `/uploads/${file.filename}`);
    log(`Generated image URLs: ${urls.join(", ")}`, "storage");
    return urls;
  }

  async createRegistration(registration: InsertRegistration, qrCode?: string): Promise<Registration> {
    log(`Creating registration for event ${registration.eventId}`, "storage");

    const qrCodeValue = qrCode || crypto.randomBytes(16).toString('hex');

    // Ensure attendees is always a JSON string
    let attendeesStr = registration.attendees;
    if (typeof attendeesStr !== 'string') {
      attendeesStr = JSON.stringify(attendeesStr);
    }

    const [newRegistration] = await db.insert(registrations).values({
      ...registration,
      attendees: attendeesStr,
      qrCode: qrCodeValue
    }).returning();

    log(`Created registration ${newRegistration.id}`, "storage");
    return newRegistration;
  }

  async getEventRegistrations(eventId: number): Promise<Registration[]> {
    log(`Getting registrations for event ${eventId}`, "storage");
    try {
      const eventRegistrations = await db
        .select()
        .from(registrations)
        .where(eq(registrations.eventId, eventId));

      log(`Found ${eventRegistrations.length} registrations for event ${eventId}`, "storage");
      return eventRegistrations;
    } catch (error) {
      log(`Error getting registrations for event ${eventId}: ${error}`, "storage");
      throw error;
    }
  }

  async checkInRegistration(qrCode: string): Promise<Registration> {
    log(`Checking in registration with QR code ${qrCode}`, "storage");

    const [updatedRegistration] = await db
      .update(registrations)
      .set({ 
        checkedIn: true,
        checkedInAt: new Date()
      })
      .where(eq(registrations.qrCode, qrCode))
      .returning();

    if (!updatedRegistration) {
      throw new Error("Invalid QR code");
    }

    log(`Checked in registration ${updatedRegistration.id}`, "storage");
    return updatedRegistration;
  }

  async getRegistrationByQrCode(qrCode: string): Promise<Registration | undefined> {
    log(`Getting registration by QR code ${qrCode}`, "storage");
    const [registration] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.qrCode, qrCode));

    log(`Registration ${registration ? 'found' : 'not found'} for QR code ${qrCode}`, "storage");
    return registration;
  }
}

export const storage = new DatabaseStorage();
export { upload };