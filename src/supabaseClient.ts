// FIX: Correctly augmented the global ImportMeta type to include Vite's environment variables.
// The previous interface declarations were local to the module and did not modify the global type.
// This resolves TypeScript errors when the `vite/client` types are not automatically discovered.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
      // FIX: Added environment variable for Mercado Pago App ID
      readonly VITE_MERCADO_PAGO_APP_ID: string;
    };
  }
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// Acessa as variáveis de ambiente da maneira correta para projetos Vite.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient<Database> | null = null;
let supabaseInitializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  // Não lança um erro, mas define a mensagem de erro para ser exibida pela UI.
  supabaseInitializationError = "As variáveis de ambiente do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas. Para que o aplicativo funcione, essas chaves precisam ser definidas no ambiente de execução. Elas não devem ser inseridas diretamente no código.";
} else {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error: any) {
    supabaseInitializationError = `Ocorreu um erro ao inicializar o Supabase: ${error.message}`;
  }
}

export { supabase, supabaseInitializationError };