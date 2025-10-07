// FIX: Replaced manual type definitions for `import.meta.env` with a triple-slash directive.
// This references Vite's client types, which is the standard and more robust way to ensure
// `import.meta.env` and its properties are correctly typed across the project.
/// <reference types="vite/client" />

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
