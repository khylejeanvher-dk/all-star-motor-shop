// product-view.js — Renders product.html based on ?id= URL param
import { getProductById, products } from './data.js';
import { addToCart } from './cart.js';

export function initProductView() {
  const wrap = document.getElementById('productViewWrap');
  if (!wrap) return;

  const params  = new URLSearchParams(window.location.search);
  const id      = params.get('id');
  const product = getProductById(id);

  if (!product) {
    wrap.innerHTML = `<div class="product-not-found"><h2>Product not found</h2><a href="index.html" class="btn btn-dark">← Back to Home</a></div>`;
    return;
  }

  document.title = `${product.name} — ALL STAR MOTOR SHOP`;

  const badgeHTML = product.soldOut
    ? '<span class="pv-badge sold-out">SOLD OUT</span>'
    : (product.badge ? `<span class="pv-badge new">${product.badge}</span>` : '');

  const specsHTML = product.specs
    ? Object.entries(product.specs).map(([k, v]) => `
        <div class="pv-spec-row">
          <span class="pv-spec-label">${k}</span>
          <span class="pv-spec-value">${v}</span>
        </div>`).join('')
    : '';

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
  const relatedHTML = related.map(p => `
    <a href="product.html?id=${p.id}" class="product-card">
      <div class="product-img-wrap">
        <img src="${p.image}" alt="${p.name}" class="product-img" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="img-placeholder" style="display:none">
          <svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2.5"/></svg>
        </div>
        ${p.soldOut ? '<span class="badge sold-out">SOLD OUT</span>' : (p.badge ? `<span class="badge new">${p.badge}</span>` : '')}
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">₱${p.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} PHP</p>
      </div>
    </a>`).join('');

  wrap.innerHTML = `
    <nav class="pv-breadcrumb">
      <a href="index.html">Home</a>
      <span>›</span>
      <a href="category.html?cat=${product.category}">${product.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</a>
      <span>›</span>
      <span>${product.name}</span>
    </nav>

    <div class="pv-main">
      <div class="pv-image-wrap">
        <img src="${product.image}" alt="${product.name}" class="pv-real-img"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="pv-image-placeholder" style="display:none">
          <svg viewBox="0 0 60 60" fill="none"><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2.5"/></svg>
        </div>
        ${badgeHTML}
      </div>

      <div class="pv-info">
        <p class="pv-category">${product.category.replace(/-/g, ' ').toUpperCase()}</p>
        <h1 class="pv-name">${product.name}</h1>
        <p class="pv-price">₱${product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })} <span>PHP</span></p>
        <p class="pv-desc">${product.description}</p>

        ${specsHTML ? `
        <div class="pv-specs">
          <h3 class="pv-specs-title">SPECIFICATIONS</h3>
          ${specsHTML}
        </div>` : ''}

        <div class="pv-actions">
          ${product.soldOut
            ? `<button class="btn btn-dark btn-full pv-btn" disabled>SOLD OUT</button>`
            : `<button class="btn btn-dark btn-full pv-btn" id="pvAddToCart">ADD TO CART</button>`
          }
          <a href="category.html?cat=${product.category}" class="btn btn-outline btn-full">← BACK TO ${product.category.replace(/-/g, ' ').toUpperCase()}</a>
        </div>
      </div>
    </div>

    ${related.length ? `
    <section class="pv-related">
      <div class="section-header">
        <h2 class="section-title">YOU MAY ALSO LIKE</h2>
      </div>
      <div class="product-grid">${relatedHTML}</div>
    </section>` : ''}
  `;

  document.getElementById('pvAddToCart')?.addEventListener('click', () => {
    addToCart(product.name, product.price, product.image);
  });
}
