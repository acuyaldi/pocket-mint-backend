---
name: dev
description: Start Pocket Mint's frontend and backend dev servers together. Use when the user asks to run, start, or launch the app locally, or wants to test a change end to end.
disable-model-invocation: true
---

Start both apps for local development. There is no root script that does this — each app is run independently.

1. Start the backend (Express + Prisma) in the background:
   ```
   cd apps/backend && npm run dev
   ```
   This uses `ts-node-dev` with auto-respawn on file changes.

2. Start the frontend (Next.js) in the background:
   ```
   cd apps/frontend && npm run dev
   ```
   This runs on **port 4000** (not the Next.js default 3000).

3. Report both URLs back to the user once ready (backend port comes from `apps/backend/.env`'s `PORT`; frontend is `http://localhost:4000`).

If either `npm install` hasn't been run in that app's directory, run it first — the backend's `postinstall` also runs `prisma generate`, which is required before the backend will start successfully.
