import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build --mode preview`는 미리보기용 한 파일짜리 HTML을 만든다.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'preview' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
  },
}));
