// header.js — Scroll shadow on header
const header = document.getElementById('header');

function initHeader() {
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 10 ? '0 4px 20px rgba(0,0,0,0.1)' : '';
  }, { passive: true });
}

export { initHeader };
