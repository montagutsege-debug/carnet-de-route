import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Generates dist/sw.js (offline support) with the list of files to keep in cache.
      {
        name: 'carnet-service-worker',
        apply: 'build',
        generateBundle(_options, bundle) {
          const listFiles = (dir: string, prefix: string): string[] =>
            fs.existsSync(dir)
              ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
                  entry.isDirectory()
                    ? listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)
                    : [`${prefix}${entry.name}`]
                )
              : [];
          const files = [
            '/',
            '/index.html',
            ...Object.keys(bundle)
              .filter((f) => f !== 'index.html' && !f.endsWith('.map'))
              .map((f) => `/${f}`),
            ...listFiles(path.resolve(__dirname, 'public'), '/'),
            ...listFiles(path.resolve(__dirname, 'src/assets'), '/src/assets/'),
          ];
          const precache = [...new Set(files)].sort();
          const version = crypto
            .createHash('sha256')
            .update(precache.join('\n'))
            .digest('hex')
            .slice(0, 12);
          const template = fs.readFileSync(path.resolve(__dirname, 'src/sw-template.js'), 'utf8');
          this.emitFile({
            type: 'asset',
            fileName: 'sw.js',
            source: template
              .replace('__VERSION__', version)
              .replace('__PRECACHE__', JSON.stringify(precache, null, 2)),
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
