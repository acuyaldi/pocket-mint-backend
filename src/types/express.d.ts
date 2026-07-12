// ============================================================
// Express Request augmentation — authenticated request context
// ------------------------------------------------------------
// Declaration merging makes the canonical `req.auth` visible on every Express
// `Request` without a bespoke request subtype at each controller signature.
// `requireUser` is the ONLY writer; readers (controllers, the post-auth rate
// limiter) access it via the helpers in src/http/authContext.ts. `req.auth` is
// the sole trusted representation of request identity — no legacy mirrors exist.
// ============================================================

import type { AuthContext } from '../http/authContext';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Canonical authenticated identity, set by `requireUser` after a
       * successful auth decision. `undefined` on unauthenticated requests.
       */
      auth?: AuthContext;
    }
  }
}

export {};
