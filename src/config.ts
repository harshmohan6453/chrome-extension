// API Configuration
// Set VITE_API_URL in .env for local development, defaults to production
export const API_BASE_URL = import.meta.env.VITE_API_URL;

// Version check endpoint
export const VERSION_API_URL = `${API_BASE_URL}/api/version`;
