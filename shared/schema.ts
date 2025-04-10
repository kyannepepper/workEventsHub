import { pgTable, text, serial, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
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
  price: decimal("price", { precision: 10, scale: 2 }).default('0'),
  capacity: integer("capacity").notNull(),
  spotsLeft: integer("spots_left").notNull(),
  waiver: text("waiver"),
  needsWaiver: boolean("needs_waiver").notNull().default(false),
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
    // Allow decimal prices but keep capacity as integer
    price: z.number().nonnegative().multipleOf(0.01),
    capacity: z.number().int().positive(),
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
  email: text("email").notNull(),
  qrCode: text("qr_code").default(''),
  checkedIn: boolean("checked_in").notNull().default(false),
  checkedInAt: timestamp("checked_in_at"),
  waiverSigned: boolean("waiver_signed").notNull().default(false),
  waiverSignedAt: timestamp("waiver_signed_at"),
  // Store attendees as a JSON array of objects
  attendees: text("attendees").notNull(),
  isMinor: boolean("is_minor").default(false)
});

export const insertRegistrationSchema = createInsertSchema(registrations)
  .omit({ 
    id: true,
    checkedIn: true,
    checkedInAt: true,
    waiverSigned: true,
    waiverSignedAt: true
  });

// Define the attendee type
export const attendeeSchema = z.object({
  name: z.string(),
  type: z.enum(['adult', 'minor']),
  isPrimary: z.boolean(),
  waiverSigned: z.boolean().optional()
});

export type Attendee = z.infer<typeof attendeeSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;