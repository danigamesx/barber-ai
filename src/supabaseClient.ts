import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// FIX: Changed from import.meta.env to process.env to align with the Vite configuration update.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// FIX: Changed from import.meta.env to process.env to align with the Vite configuration update.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias no seu ambiente.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);