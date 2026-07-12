// ============================================================
// Express Request augmentation — authenticated request context
// ------------------------------------------------------------
// Declaration merging makes the canonical `req.auth` (and the deprecated legacy
// mirrors) visible on every Express `Request` without a bespoke request subtype
// at each controller signature. `requireUser` is the ONLY writer; controllers
// read `req.auth` via the helpers in src/http/authContext.ts.
// ============================================================

import type { AuthContext, AuthMethod } from '../http/authContext';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Canonical authenticated identity, set by `requireUser` after a
       * successful auth decision. `undefined` on unauthenticated requests.
       */
      auth?: AuthContext;

      /**
       * @deprecated Legacy mirror of `auth.userId`. Retained ONLY for readers
       * not yet migrated to `req.auth` (rate-limit keying, installment
       * controller). New code MUST use `req.auth` / `getAuthenticatedUserId`.
       */
      userId?: string;

      /**
       * @deprecated Legacy mirror of `auth.method`. Retained only for
       * backwards compatibility; read `req.auth.method` instead.
       */
      authMethod?: AuthMethod;
    }
  }
}

export {};
