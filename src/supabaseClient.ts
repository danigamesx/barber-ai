// FIX: Removed the vite/client reference as it was causing a type error and is not needed when using process.env.
// This change aligns with project conventions for accessing environment variables.

import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// FIX: Switched from `import.meta.env` to `process.env` to resolve type errors and align with conventions.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// FIX: Switched from `import.meta.env` to `process.env` to resolve type errors and align with conventions.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required in your .env file.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);