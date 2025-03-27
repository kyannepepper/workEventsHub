import { User, Event, InsertUser, InsertEvent, users, events, Attendee, InsertAttendee, attendees } from "@shared/schema";
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
  // Attendee methods
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  getEventAttendees(eventId: number): Promise<Attendee[]>;
  checkInAttendee(ticketCode: string): Promise<Attendee>;
  getAttendeeByTicketCode(ticketCode: string): Promise<Attendee | undefined>;
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

    const [newEvent] = await db.insert(events).values({
      ...event,
      date: event.startTime,
      spotsLeft: event.capacity,
    }).returning();

    log(`Created event ${newEvent.id} with values:`, {
      price: newEvent.price,
      capacity: newEvent.capacity
    });

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
    log(`Update payload:`, eventUpdate);

    const [updatedEvent] = await db
      .update(events)
      .set(eventUpdate)
      .where(eq(events.id, id))
      .returning();

    log(`Updated event ${id}:`, updatedEvent);
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

  async createAttendee(attendee: InsertAttendee): Promise<Attendee> {
    log(`Creating attendee for event ${attendee.eventId}`, "storage");

    // Generate a unique ticket code
    const ticketCode = crypto.randomBytes(16).toString('hex');

    const [newAttendee] = await db.insert(attendees).values({
      ...attendee,
      ticketCode,
    }).returning();

    log(`Created attendee ${newAttendee.id}`, "storage");
    return newAttendee;
  }

  async getEventAttendees(eventId: number): Promise<Attendee[]> {
    log(`Getting attendees for event ${eventId}`, "storage");
    const eventAttendees = await db
      .select()
      .from(attendees)
      .where(eq(attendees.eventId, eventId));

    log(`Found ${eventAttendees.length} attendees for event ${eventId}`, "storage");
    return eventAttendees;
  }

  async checkInAttendee(ticketCode: string): Promise<Attendee> {
    log(`Checking in attendee with ticket code ${ticketCode}`, "storage");

    const [updatedAttendee] = await db
      .update(attendees)
      .set({ 
        checkedIn: true,
        checkedInAt: new Date()
      })
      .where(eq(attendees.ticketCode, ticketCode))
      .returning();

    if (!updatedAttendee) {
      throw new Error("Invalid ticket code");
    }

    log(`Checked in attendee ${updatedAttendee.id}`, "storage");
    return updatedAttendee;
  }

  async getAttendeeByTicketCode(ticketCode: string): Promise<Attendee | undefined> {
    log(`Getting attendee by ticket code ${ticketCode}`, "storage");
    const [attendee] = await db
      .select()
      .from(attendees)
      .where(eq(attendees.ticketCode, ticketCode));

    log(`Attendee ${attendee ? 'found' : 'not found'} for ticket code ${ticketCode}`, "storage");
    return attendee;
  }
}

export const storage = new DatabaseStorage();
export { upload };