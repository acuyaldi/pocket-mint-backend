import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Each test builds its own module graph via vi.resetModules(); run serially
    // so shared process.env mutations don't race across files.
    fileParallelism: false,
  },
});
