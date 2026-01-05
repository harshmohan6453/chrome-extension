// API Configuration
// Update this URL after deploying to Vercel
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Version check endpoint
export const VERSION_API_URL = `${API_BASE_URL}/api/version`;
