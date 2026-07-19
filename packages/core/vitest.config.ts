import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    exclude: ['dist/**', 'node_modules/**'],
    coverage: {reporter: ['text', 'json', 'html']},
  },
});
