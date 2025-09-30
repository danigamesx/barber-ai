// FIX: Add a triple-slash directive to include Vite's client types. This provides the necessary type definitions for `import.meta.env` and resolves TypeScript errors.
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required in your .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);