// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://adityaraj142857.github.io',
  base: '/pgdba-ml',
  vite: {
    plugins: [tailwindcss()]
  }
});