import axios from "axios";

// If VITE_API_URL is configured (e.g. in Vercel production), prepend it to /api.
// Otherwise, use relative "/api" (which Vite proxies in development).
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : "/api";

const API = axios.create({
  baseURL,
});

export default API;