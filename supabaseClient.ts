// FIX: Troquei de import.meta.env para process.env para resolver erros de runtime.
// Removi a declaração de tipo global ImportMeta, que não é mais usada.

import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessárias no seu ambiente.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
