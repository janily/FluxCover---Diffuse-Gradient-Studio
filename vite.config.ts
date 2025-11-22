import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    preview: {
      port: 8080,
      host: '0.0.0.0',
      allowedHosts: ['*.zeabur.app', 'localhost']
    },
    plugins: [react()],
    define: {
      'process.env.GRSAI_API_KEY': JSON.stringify(process.env.GRSAI_API_KEY),
      'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
