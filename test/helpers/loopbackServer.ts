import http, { type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll } from 'vitest';

/**
 * One HTTP server per test file, bound to 127.0.0.1 on an OS-assigned port
 * (listen(0)) in beforeAll and closed in afterAll.
 *
 * Why not `supertest(app)`: it runs `http.createServer(app).listen(0)` with no
 * host, which binds `::` (dual-stack). That bind does not conflict with another
 * process's `127.0.0.1:<port>` listener (e.g. an editor helper in the same
 * ephemeral range), yet supertest then dials `127.0.0.1:<port>` — and the more
 * specific foreign listener answers: a random 404 or "socket hang up". Binding
 * 127.0.0.1 makes the OS refuse a taken port, so that collision cannot happen.
 *
 * Call it at module top level. Each `serve(app)` mounts that app under its own
 * `/__appN` prefix and returns its base URL for `request(url)`, so a test that
 * builds several apps (different clocks, mocks) still reaches the right one.
 */
export function loopbackServer(): (app: RequestListener) => string {
  const apps: RequestListener[] = [];
  const server = http.createServer((req, res) => {
    const match = /^\/__app(\d+)(.*)$/.exec(req.url ?? '');
    const app = match ? apps[Number(match[1])] : undefined;
    if (!match || !app) {
      res.statusCode = 421;
      res.end('unknown test app');
      return;
    }
    req.url = match[2]!.startsWith('/') ? match[2]! : `/${match[2]}`;
    app(req, res);
  });
  beforeAll(() => new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  }));
  afterAll(() => new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  }));
  return (app) => {
    apps.push(app);
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}/__app${apps.length - 1}`;
  };
}
