// API base URL
//
// Local dev:   set nothing — falls back to your Mac's LAN IP so the
//              simulator/device can reach the backend on the same network.
//
// Production:  set EXPO_PUBLIC_API_BASE_URL=https://your-app.railway.app
//              in a .env file at the frontend root or in your EAS build config.
//
// Expo automatically exposes any EXPO_PUBLIC_* variable to the JS bundle.

const LOCAL_URL = 'http://100.75.166.65:3001';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || LOCAL_URL;
