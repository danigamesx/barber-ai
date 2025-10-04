import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // FIX: Define process.env to make environment variables available in the client-side code,
    // resolving issues where import.meta.env is not recognized by TypeScript.
    define: {
      'process.env': env,
    },
  };
});
