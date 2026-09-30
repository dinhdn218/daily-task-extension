import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: { baseIconPath: 'assets/icon.svg' },
  manifest: {
    name: 'Việc hôm nay',
    description: 'Danh sách việc hôm nay ngay trên tab mới, kèm nhắc đúng giờ.',
    permissions: ['storage', 'alarms', 'notifications'],
  },
  vite: () => ({ plugins: [tailwindcss()] }),
});
