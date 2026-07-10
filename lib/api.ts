import axios from 'axios';
import { createClient } from '@/lib/supabase/client';

// Base URL points to the backend. Adjust if you run the API on a different host/port.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'kunci_rahasia_pocket_mint_2026',
  },
});

// Attach the authenticated user's identity on every request so the backend can
// scope Wallets/Transactions per user. The Supabase UID equals the backend
// User.id (set by /users/sync), so the backend resolves the right user from it.
// Without this header the backend rejects the request instead of leaking data.
api.interceptors.request.use(async (config) => {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      config.headers.set('x-user-id', session.user.id);
      if (session.user.email) {
        config.headers.set('x-user-email', session.user.email);
      }
    }
  } catch {
    // No session available — let the request proceed unidentified; the backend
    // will respond 401 rather than serve another user's data.
  }

  return config;
});

export default api;
