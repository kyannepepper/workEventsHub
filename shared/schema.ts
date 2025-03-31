import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  department: text("department").notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  unitNumber: text("unit_number").notNull(),
  revenueCode: text("revenue_code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull().defaultNow(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location").notNull(),
  price: integer("price").default(0),
  capacity: integer("capacity").notNull(),
  spotsLeft: integer("spots_left").notNull(),
  waiver: text("waiver"),
  images: text("images").array(),
  createdBy: integer("created_by").notNull(),
  category: text("category").notNull(),
});

// Separate schema for login
export const loginSchema = z.object({
  username: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    confirmPassword: z.string(),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const insertEventSchema = createInsertSchema(events)
  .extend({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    images: z.array(z.string()).optional(),
    description: z.string().optional(),
    category: z.enum([
      "Community",
      "Education",
      "Sports",
      "Culture",
      "Government",
      "Other"
    ]),
    // Make these strict integer fields without any coercion
    price: z.number().int(),
    capacity: z.number().int(),
  })
  .omit({
    id: true,
    createdBy: true,
    date: true,
    spotsLeft: true,
  });

export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
  checkedIn: boolean("checked_in").notNull().default(false),
  checkedInAt: timestamp("checked_in_at"),
  waiverSigned: boolean("waiver_signed").notNull().default(false),
  waiverSignedAt: timestamp("waiver_signed_at"),
  ticketCode: text("ticket_code").notNull().unique(), // For QR code text identification
  qrCodeData: text("qr_code_data"), // For storing Base64-encoded QR codes
});

export const insertRegistrationSchema = createInsertSchema(registrations)
  .omit({ 
    id: true,
    checkedIn: true,
    checkedInAt: true,
    waiverSigned: true,
    waiverSignedAt: true,
    ticketCode: true, // Generated server-side
    qrCodeData: true  // Generated or imported server-side
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendees.$inferSelect;