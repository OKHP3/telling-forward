import "express-session";

declare module "express-session" {
  interface SessionData {
    /** Authenticated platform user ID */
    userId?: number;
    /** CSRF state token used during GitHub OAuth flow */
    oauthState?: string;
  }
}
