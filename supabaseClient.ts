import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database'; // We will create this type definition file next

// TODO: Substitua pelas suas credenciais do Supabase que você obteve na Etapa 1.
const supabaseUrl = 'https://yrhdmqusjnniyibfbsgf.supabase.co'; // Ex: 'https://xxxxxxxx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaGRtcXVzam5uaXlpYmZic2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNTIxNzQsImV4cCI6MjA3MzYyODE3NH0.b31clXYGeKdXlH1pTZxidDPMmeRDncYCWplTjH2wwYM'; // Ex: 'eyJh...'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are required.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);