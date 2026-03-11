// category.js — Renders category.html filtered by ?tag= or ?cat=
import { getProductsByTag, getProductsByCategory, tagCategories } from './data.js';

function productCardHTML(p) {
  const badgeHTML = p.soldOut
    ? '<span class="badge sold-out">SOLD OUT</span>'
    : (p.badge ? `<span class="badge new">${p.badge}</span>` : '');
  return `
    <a class="product-card" href="product.html?id=${p.id}">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="img-placeholder" style="display:none">
          <svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2.5"/></svg>
          <span>${p.name}</span>
        </div>
        ${badgeHTML}
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">₱${p.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} PHP</p>
      </div>
    </a>`;
}

export function initCategory() {
  const grid    = document.getElementById('categoryGrid');
  const titleEl = document.getElementById('categoryTitle');
  const countEl = document.getElementById('categoryCount');
  const navEl   = document.getElementById('categoryNav');
  const emptyEl = document.getElementById('categoryEmpty');
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  const tag    = params.get('tag') || 'all';

  // Get the label for this tag
  const tagMeta = tagCategories.find(t => t.tag === tag) || { tag: 'all', label: 'All Parts & Gear' };
  const prods   = getProductsByTag(tag);

  if (titleEl) titleEl.textContent = tagMeta.label.toUpperCase();
  document.title = `${tagMeta.label} — ALL STAR MOTOR SHOP`;
  if (countEl) countEl.textContent = `${prods.length} product${prods.length !== 1 ? 's' : ''}`;

  // Build sidebar nav dynamically from tagCategories
  if (navEl) {
    navEl.innerHTML = `<h3>CATEGORIES</h3>` +
      tagCategories.map(t => `
        <a href="category.html?tag=${t.tag}" data-tag="${t.tag}"
           class="${t.tag === tag ? 'active' : ''}">${t.label}</a>
      `).join('');
  }

  if (!prods.length) {
    grid.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  grid.style.display = '';
  grid.innerHTML = prods.map(productCardHTML).join('');
}
