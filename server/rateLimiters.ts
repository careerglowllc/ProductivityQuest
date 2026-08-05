import rateLimit from "express-rate-limit";

// ── Rate limiting — brute-force / abuse protection ──────────────────────────
// Previously this app had NO rate limiting on any endpoint, meaning login,
// registration, and password-reset endpoints could be hammered indefinitely
// (unlimited password-guessing attempts, mass fake-account creation, email
// bombing via forgot-password). These limiters close that gap using
// industry-standard windows/thresholds without affecting normal usage.

// Login: 10 attempts per 15 minutes per IP. Successful logins don't count
// against the limit, so a legitimate user who mistypes once or twice is never
// blocked from finally getting in.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Registration: 5 accounts per hour per IP — prevents mass account creation.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many accounts created from this location. Please try again later." },
});

// Forgot/reset password: 5 requests per hour per IP — prevents email-bombing
// a victim's inbox and limits reset-token brute forcing.
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Please try again later." },
});

// General API safety net — generous enough not to interfere with normal
// polling/dashboard usage (market prices, tasks, finances, etc.) but stops
// runaway scripts or scraping.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
