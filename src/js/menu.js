
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const menuClose  = document.getElementById('menuClose');
const overlay    = document.getElementById('overlay');

// ── DESKTOP DROPDOWNS 
function initDesktopDropdowns() {
  const items = document.querySelectorAll('.has-dropdown');

  items.forEach(item => {
    const trigger = item.querySelector('.dropdown-trigger');

    trigger.addEventListener('click', (e) => {
      e.preventDefault();      // never navigate
      e.stopPropagation();
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Close when clicking outside
  document.addEventListener('click', () => {
    items.forEach(i => i.classList.remove('open'));
  });

  // Keep open when clicking inside the dropdown itself
  document.querySelectorAll('.dropdown').forEach(dd => {
    dd.addEventListener('click', e => e.stopPropagation());
  });
}

// ── MOBILE MENU 
function openMenu() {
  mobileMenu.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  mobileMenu.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function initMobileSubmenus() {
  document.querySelectorAll('.mobile-sub-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.mobile-has-sub').classList.toggle('open');
    });
  });
}

function initMenu() {
  initDesktopDropdowns();
  initMobileSubmenus();
  hamburger?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', closeMenu);
  overlay?.addEventListener('click', closeMenu);
}

export { initMenu, closeMenu };
