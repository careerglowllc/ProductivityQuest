import type { RequestHandler } from "express";
import { storage } from "./storage";

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to require authentication
export const requireAuth: RequestHandler = async (req, res, next) => {
  // Check for session userId
  if (req.session?.userId) {
    return next();
  }

  return res.status(401).json({ message: "Authentication required" });
};

// Helper to get current user from session
export async function getCurrentUser(req: any) {
  if (!req.session?.userId) {
    return null;
  }
  
  try {
    const user = await storage.getUserById(req.session.userId);
    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}
