import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [
    angular()
  ],
  assetsInclude: ['**/*.worklet.js'],
  server: {
    fs: {
      strict: false // Для разрешения импортов из node_modules
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      external: [
        // Добавьте сюда любые модули, которые нужно исключить из сборки
      ],
      output: {
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});