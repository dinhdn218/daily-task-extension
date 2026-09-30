import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // WxtVitest: alias '@/', auto-import, và thay `browser` bằng fakeBrowser
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    restoreMocks: true,
  },
});
