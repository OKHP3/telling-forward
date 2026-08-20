---
name: Contributor auth compatibility
description: The decision to preserve API cookie-session contributors alongside Clerk-authenticated clients.
---

Protected API routes must accept an already-established contributor session before attempting the Clerk identity bridge. Web contributor login and registration use the API's password and cookie-session flow; Clerk remains a valid path for the other clients that use it.

**Why:** The web reader's contributor flow relies on the generated API authentication contract and persisted server sessions, while the workspace also has clients that use Clerk. Treating either identity source as the sole authority breaks a valid client path.

**How to apply:** Keep the two identity paths compatible in authorization middleware. On any change of contributor identity, clear client-side user-scoped caches; when creating a password-authenticated session, rotate the session identifier before assigning the user.