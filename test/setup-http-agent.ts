// supertest starts a fresh ephemeral server per request. Node >= 19's global
// agent keeps sockets alive, so a pooled socket can outlive its server and
// deliver the next request to a closing or port-reusing server — seen as a
// random 401/404 or "socket hang up" in the integration suite. Tests only.
import http from 'node:http';

http.globalAgent = new http.Agent({ keepAlive: false });
