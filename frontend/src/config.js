// Base URL for your backend API (switches via env vars)
export const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// Judge0 API configuration (from env vars for security)
export const JUDGE0_CONFIG = {
  API_URL: import.meta.env.VITE_JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com',
  API_KEY: import.meta.env.VITE_JUDGE0_API_KEY, 
  HOST: import.meta.env.VITE_JUDGE0_HOST || 'judge0-ce.p.rapidapi.com'
};
