import { createClient } from '@supabase/supabase-js';

// Usar VITE_ prefijo porque vamos a importarlo en el frontend, 
// o si no están definidas, hacer un fallback a las del backend para demo 
// (aunque en producción deberían estar en .env de Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://txknueiekhgtahyvleer.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a251ZWlla2hndGFoeXZsZWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MTcwNTMsImV4cCI6MjA4NzI5MzA1M30.pzFQN0AugVrkk9_toS9BL2smGWWJ8ef5groR4lN2yZs';

export const supabase = createClient(supabaseUrl, supabaseKey);
