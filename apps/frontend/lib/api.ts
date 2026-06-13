import axios from 'axios';

// Base URL points to the backend. Adjust if you run the API on a different host/port.
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'kunci_rahasia_pocket_mint_2026',
  },
});

export default api;
