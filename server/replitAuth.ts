import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? "https://replit.com/oidc";
    const clientId = process.env.REPL_ID!;
    
    console.log(`🔧 OIDC Configuration:`);
    console.log(`   Issuer URL: ${issuerUrl}`);
    console.log(`   Client ID: ${clientId}`);
    
    try {
      const config = await client.discovery(
        new URL(issuerUrl),
        clientId
      );
      console.log(`✅ OIDC discovery successful`);
      return config;
    } catch (error) {
      console.error(`❌ OIDC discovery failed:`, error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log(`✅ Authentication successful for user`);
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      console.log(`👤 User upserted successfully: ${tokens.claims().email}`);
      verified(null, user);
    } catch (error) {
      console.error(`❌ Authentication verification failed:`, error);
      verified(error, null);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategyName = `replitauth:${domain}`;
    const callbackURL = `https://${domain}/api/callback`;
    
    console.log(`🎯 Registering auth strategy:`);
    console.log(`   Strategy name: ${strategyName}`);
    console.log(`   Callback URL: ${callbackURL}`);
    
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`✅ Strategy registered successfully`);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log(`🔑 Login attempt from hostname: ${req.hostname}`);
    console.log(`🔗 Available domains: ${process.env.REPLIT_DOMAINS}`);
    
    const authStrategy = `replitauth:${req.hostname}`;
    console.log(`🎯 Using auth strategy: ${authStrategy}`);
    
    passport.authenticate(authStrategy, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log(`🔄 Callback received from hostname: ${req.hostname}`);
    
    const authStrategy = `replitauth:${req.hostname}`;
    console.log(`🎯 Using auth strategy for callback: ${authStrategy}`);
    
    passport.authenticate(authStrategy, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};