// loading.js — Logo loading screen with spinner

export function initLoading() {
  const screen = document.getElementById('loadingScreen');
  if (!screen) return;

  // Hide after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      screen.classList.add('hidden');
    }, 800);
  });

  // Fallback: force hide after 3s
  setTimeout(() => {
    screen.classList.add('hidden');
  }, 3000);
}
