// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import path from 'path';

// https://astro.build/config
export default defineConfig({
  // Set the site URL for production
  site: 'https://mycaloriebalance.com',
  
  // Base path (set to '/' for most sites)
  base: '/',
  
  // Configure Vite plugins and server settings
  vite: {
    // Align Vite/Astro aliases with tsconfig paths for consistent resolution in .astro files
    resolve: {
      alias: {
        '@components': path.resolve('./src/layouts/components'),
        '@react': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@config': path.resolve('./src/config'),
        '@utils': path.resolve('./src/utils'),
        '@styles': path.resolve('./src/styles'),
        '@assets': path.resolve('./src/assets'),
      },
    },
    plugins: [],
    server: {
      fs: {
        allow: [
          // Allow the project root (default)
          '.',
          // Allow the src/assets directory to be served directly during development.
          // This is needed for cases where assets from src/assets/ are referenced
          // by direct string paths (e.g., in Markdown frontmatter processed by pages)
          // instead of ESM imports. For example, the image specified in 
          // 'src/content/about/index.md' and used by 'src/pages/about.astro'.
          path.resolve('./src/assets'),
        ],
      },
    },
  },
  
  // Configure Astro integrations
  integrations: [tailwind(), mdx(), icon(), sitemap(), react()]
});