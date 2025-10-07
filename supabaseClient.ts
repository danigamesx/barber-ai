import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// Acessando as variáveis de ambiente através do process.env.
// Esta abordagem assume que o ambiente de execução (como Vercel, Netlify, etc.)
// injeta essas variáveis de forma segura, similar ao que é feito para chaves de API server-side.
// Isso resolve o erro "Cannot read properties of undefined" que ocorre quando import.meta.env não é populado.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
