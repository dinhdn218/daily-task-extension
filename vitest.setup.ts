import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { afterEach } from 'vitest';

// happy-dom không chạy Web Animations đầy đủ → tắt animation của Motion khi test.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});
