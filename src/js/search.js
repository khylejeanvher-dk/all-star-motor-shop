// search.js — Search overlay with live results
import { searchProducts } from './data.js';

export function initSearch() {
  const overlay  = document.getElementById('searchOverlay');
  const closeBtn = document.getElementById('searchClose');
  const input    = document.getElementById('searchInput');
  const results  = document.getElementById('searchResults');
  const triggers = document.querySelectorAll('#searchToggle, #mobileSearchToggle');

  if (!overlay) return;

  function openSearch() {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => input?.focus(), 100);
  }

  function closeSearch() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    if (input) input.value = '';
    if (results) results.innerHTML = '<p class="search-hint">Start typing to search…</p>';
  }

  triggers.forEach(t => t.addEventListener('click', e => { e.preventDefault(); openSearch(); }));
  closeBtn?.addEventListener('click', closeSearch);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

  input?.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 2) {
      results.innerHTML = '<p class="search-hint">Type at least 2 characters…</p>';
      return;
    }

    const found = searchProducts(q);
    if (!found.length) {
      results.innerHTML = '<p class="search-no-results">No products found.</p>';
      return;
    }

    results.innerHTML = found.map(p => `
      <a class="search-result-item" href="product.html?id=${p.id}">
        <div class="search-result-img">
          <img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover"
            onerror="this.style.display='none'">
        </div>
        <div class="search-result-info">
          <span class="search-result-name">${p.name}</span>
          <span class="search-result-cat">${p.category.replace(/-/g, ' ').toUpperCase()}</span>
          <span class="search-result-price">₱${p.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </div>
        ${p.soldOut ? '<span class="search-badge sold-out">SOLD OUT</span>' : (p.badge ? `<span class="search-badge new">${p.badge}</span>` : '')}
      </a>
    `).join('');
  });
}
