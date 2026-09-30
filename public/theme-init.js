// Chạy đồng bộ trong <head> trước khi trang vẽ, để chế độ tối không bị nháy trắng.
// Giữ logic khớp với lib/theme.ts (key 'theme', giá trị light | dark | system).
(function () {
  var preference = 'system';
  try {
    preference = localStorage.getItem('theme') || 'system';
  } catch (e) {}
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
