// cart.js — Cart drawer with Firestore persistence, images, qty controls, checkout
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged }      from 'firebase/auth';
import { auth, db }                from './firebase.js';

// ── DOM refs 
const cartDrawer  = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose   = document.getElementById('cartClose');
const cartBody    = document.getElementById('cartBody');
const cartFooter  = document.getElementById('cartFooter');
const cartTotal   = document.getElementById('cartTotal');
const cartCountEl = document.querySelector('.cart-count');

let cart        = [];
let currentUser = null;
let unsubCart   = null;

// ── Firestore 
function cartDocRef(uid) { return doc(db, 'carts', uid); }

async function saveCart() {
  if (!currentUser) return;
  try { await setDoc(cartDocRef(currentUser.uid), { items: cart, updatedAt: new Date().toISOString() }); }
  catch (e) { console.error('Cart save error:', e); }
}

function subscribeToCart(uid) {
  if (unsubCart) unsubCart();
  unsubCart = onSnapshot(cartDocRef(uid), snap => {
    cart = snap.exists() ? (snap.data().items || []) : [];
    renderCart();
  });
}

// ── Cart UI 
export function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

export function getCart() { return cart; }

export async function clearCart() {
  cart = [];
  renderCart();
  await saveCart();
}

function renderCart() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  if (cartCountEl) cartCountEl.textContent = count;

  if (!cart.length) {
    cartBody.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartBody.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
      <div class="cart-item-thumb">
        <img src="${item.image || ''}" alt="${item.name}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
             style="width:100%;height:100%;object-fit:cover;">
        <div class="cart-img-fallback" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">
          <svg viewBox="0 0 60 60" fill="none" style="width:36px;color:rgba(0,0,0,0.2)"><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2.5"/></svg>
        </div>
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₱${item.price.toLocaleString('en-PH',{minimumFractionDigits:2})}</div>
        <div class="cart-qty-row">
          <button class="cart-qty-btn" data-action="dec" data-index="${i}">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-index="${i}">+</button>
          <button class="cart-item-remove" data-index="${i}">Remove</button>
        </div>
      </div>
    </div>`).join('');

  cartFooter.style.display = 'flex';
  cartTotal.textContent = `₱${total.toLocaleString('en-PH',{minimumFractionDigits:2})}`;

  // Qty buttons
  cartBody.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx  = +btn.dataset.index;
      const action = btn.dataset.action;
      if (action === 'inc') { cart[idx].qty++; }
      else { cart[idx].qty--; if (cart[idx].qty <= 0) cart.splice(idx, 1); }
      renderCart();
      await saveCart();
    });
  });

  // Remove buttons
  cartBody.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      cart.splice(+btn.dataset.index, 1);
      renderCart();
      await saveCart();
    });
  });
}

export async function addToCart(name, price, image) {
  const existing = cart.find(i => i.name === name);
  if (existing) { existing.qty++; }
  else { cart.push({ name, price, image: image || '', qty: 1 }); }
  renderCart();
  openCart();
  await saveCart();
}

// ── Init 
export function initCart() {
  cartClose.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);
  document.querySelector('.cart-continue')?.addEventListener('click', closeCart);

  document.getElementById('cartToggle')?.addEventListener('click', e => { e.preventDefault(); openCart(); });
  document.getElementById('mobileCartToggle')?.addEventListener('click', e => { e.preventDefault(); openCart(); });

  // Checkout button in cart
  document.getElementById('cartCheckoutBtn')?.addEventListener('click', e => {
    e.preventDefault();
    if (!cart.length) return;
    closeCart();
    window.openCheckout?.();
  });

  onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) { subscribeToCart(user.uid); }
    else {
      if (unsubCart) { unsubCart(); unsubCart = null; }
      cart = [];
      renderCart();
    }
  });
}
