// FIX: Replaced `import.meta.env` with `process.env` to resolve TypeScript errors
// related to missing Vite client types. This aligns with the pattern used in
// other parts of the application for accessing environment variables.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;
let supabaseInitializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseInitializationError = "As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas. Para que o aplicativo funcione, essas chaves precisam ser definidas no ambiente de execução. Elas não devem ser inseridas diretamente no código.";
} else {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    supabaseInitializationError = `Ocorreu um erro ao inicializar o Supabase: ${error.message}`;
  }
}

export { supabase, supabaseInitializationError };