import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting login for user: ${username}`, "auth");
        const user = await storage.getUserByUsername(username);

        if (!user) {
          log(`User not found: ${username}`, "auth");
          return done(null, false);
        }

        const isValid = await comparePasswords(password, user.password);
        log(`Password validation result: ${isValid}`, "auth");

        if (!isValid) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        log(`Login error: ${err}`, "auth");
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.id}`, "auth");
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user: ${id}`, "auth");
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      log(`Deserialization error: ${err}`, "auth");
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      log(`Registration attempt for: ${req.body.username}`, "auth");

      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        log(`User already exists: ${req.body.username}`, "auth");
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await hashPassword(req.body.password);
      log(`Password hashed successfully`, "auth");

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      log(`User created: ${user.id}`, "auth");

      req.login(user, (err) => {
        if (err) {
          log(`Login error after registration: ${err}`, "auth");
          return next(err);
        }
        res.status(201).json(user);
      });
    } catch (error) {
      log(`Registration error: ${error}`, "auth");
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    log(`Login successful for user: ${req.user?.id}`, "auth");
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    log(`Logout attempt for user: ${req.user?.id}`, "auth");
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      log(`Unauthorized /api/user access`, "auth");
      return res.sendStatus(401);
    }
    res.json(req.user);
  });
}