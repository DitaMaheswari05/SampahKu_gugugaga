// Jika berjalan di Vercel (production), gunakan "/api"
// Jika berjalan di laptop (development), gunakan "http://localhost:5000"
export const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:5000';