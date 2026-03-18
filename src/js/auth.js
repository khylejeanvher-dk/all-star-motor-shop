// auth.js — Firebase Auth + Account Panel (v2)
// Features: session auth, phone validation, multiple addresses,
//           order tracking, receipt viewer, cancel order, admin redirect

import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, where, limit, getDocs,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';

// ── Phone validation ─────────────────────────────────────────────
function validatePhone(val) {
  const digits = val.replace(/\D/g, '');
  return digits.length === 11 || digits.length === 13;
}

function enforcePhoneDigits(input) {
  if (!input || input.dataset.phoneEnforced) return;
  input.dataset.phoneEnforced = '1';
  input.addEventListener('input', () => {
    const pos = input.selectionStart;
    let val = input.value, result = '';
    for (let i = 0; i < val.length; i++) {
      if (i === 0 && val[i] === '+') result += '+';
      else if (/\d/.test(val[i])) result += val[i];
    }
    input.value = result;
    try { input.setSelectionRange(pos, pos); } catch (e) {}
  });
}

// ── DOM refs ─────────────────────────────────────────────────────
const authModal   = document.getElementById('authModal');
const authOverlay = document.getElementById('authOverlay');
const authClose   = document.getElementById('authClose');
const loginForm   = document.getElementById('loginForm');
const signupForm  = document.getElementById('signupForm');

// ── Order status helpers ─────────────────────────────────────────
const STATUS_STEPS = ['pending','confirmed','preparing','shipped','delivered'];
const STATUS_LABELS = {
  pending:'Pending', confirmed:'Confirmed', preparing:'Preparing',
  shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled',
};
const STATUS_COLORS = {
  pending:'#f59e0b', confirmed:'#3b82f6', preparing:'#8b5cf6',
  shipped:'#06b6d4', delivered:'#22c55e', cancelled:'#ef4444',
};

function buildTrackerHTML(status) {
  if (status === 'cancelled') {
    return `<div class="order-tracker-cancelled">✕ Order Cancelled</div>`;
  }
  const idx = STATUS_STEPS.indexOf(status);
  return `<div class="order-tracker">
    ${STATUS_STEPS.map((s, i) => `
      <div class="tracker-step ${i < idx ? 'done' : i === idx ? 'active' : ''}">
        <div class="tracker-dot"></div>
        <span>${STATUS_LABELS[s]}</span>
      </div>${i < STATUS_STEPS.length - 1 ? `<div class="tracker-line ${i < idx ? 'done':''}"></div>` : ''}
    `).join('')}
  </div>`;
}

// ── Receipt viewer ────────────────────────────────────────────────
function injectReceiptModal() {
  if (document.getElementById('receiptModal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="receipt-modal-overlay" id="receiptModalOverlay"></div>
  <div class="receipt-modal" id="receiptModal">
    <div class="receipt-modal-header">
      <h3>ORDER RECEIPT</h3>
      <button id="receiptModalClose">✕</button>
    </div>
    <div class="receipt-modal-body" id="receiptModalBody"></div>
    <div class="receipt-modal-footer">
      <button class="btn btn-outline" id="receiptModalCloseBtn">CLOSE</button>
    </div>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('receiptModalClose').addEventListener('click', closeReceiptModal);
  document.getElementById('receiptModalCloseBtn').addEventListener('click', closeReceiptModal);
  document.getElementById('receiptModalOverlay').addEventListener('click', closeReceiptModal);
}

function openReceiptModal(order, orderId) {
  injectReceiptModal();
  const methodLabels = { cod:'Cash on Delivery', gcash:'GCash', maya:'Maya' };
  const date = order.createdAt?.seconds
    ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
    : '—';
  const status = order.status || 'pending';

  document.getElementById('receiptModalBody').innerHTML = `
    <div class="receipt-header">
      <div class="receipt-logo">ALL STAR MOTOR SHOP</div>
      <div class="receipt-meta">
        <div>Order <strong>#${orderId.slice(-8).toUpperCase()}</strong></div>
        <div>${date}</div>
      </div>
    </div>
    <div class="receipt-divider"></div>
    <div class="receipt-section">
      <div class="receipt-label">DELIVERY ADDRESS</div>
      <div>${order.address?.firstName||''} ${order.address?.lastName||''}</div>
      <div>${order.address?.phone||''}</div>
      <div>${order.address?.street||''}, ${order.address?.city||''}</div>
      <div>${order.address?.province||''} ${order.address?.zip||''}</div>
    </div>
    <div class="receipt-section">
      <div class="receipt-label">PAYMENT METHOD</div>
      <div>${methodLabels[order.paymentMethod] || order.paymentMethod}</div>
      ${order.paymentRef ? `<div class="receipt-ref">Ref: <strong>${order.paymentRef}</strong></div>` : ''}
    </div>
    <div class="receipt-section">
      <div class="receipt-label">ITEMS</div>
      ${(order.items||[]).map(i=>`
        <div class="receipt-item-row">
          <span>${i.name} × ${i.qty}</span>
          <span>₱${(i.price*i.qty).toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
        </div>`).join('')}
      <div class="receipt-total-row">
        <span>TOTAL</span>
        <span>₱${(order.total||0).toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
      </div>
    </div>
    <div class="receipt-status-row">
      Status: <span class="receipt-status-badge" style="background:${STATUS_COLORS[status]||'#888'}">${STATUS_LABELS[status]||status}</span>
    </div>`;

  document.getElementById('receiptModal').classList.add('open');
  document.getElementById('receiptModalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeReceiptModal() {
  document.getElementById('receiptModal')?.classList.remove('open');
  document.getElementById('receiptModalOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Cancel order ──────────────────────────────────────────────────
async function cancelOrder(orderId, btn) {
  if (!confirm('Are you sure you want to cancel this order?')) return;
  btn.disabled = true; btn.textContent = 'Cancelling…';
  try {
    await updateDoc(doc(db,'orders',orderId), { status:'cancelled' });
    await loadOrders(auth.currentUser?.uid);
  } catch(e) {
    console.error('Cancel order:',e);
    btn.disabled = false; btn.textContent = '✕ Cancel';
  }
}

// ── Address helpers ───────────────────────────────────────────────
function genAddrId() { return 'addr_'+Date.now()+'_'+Math.random().toString(36).slice(2,6); }

function renderAddressCard(addr) {
  return `
  <div class="addr-card" data-id="${addr.id}">
    <div class="addr-card-top">
      <span class="addr-label-tag">${addr.label||'Address'}</span>
      ${addr.isDefault ? '<span class="addr-default-badge">Default</span>' : ''}
    </div>
    <div class="addr-line"><strong>${addr.firstName} ${addr.lastName}</strong></div>
    <div class="addr-line">${addr.phone}</div>
    <div class="addr-line">${addr.street}</div>
    <div class="addr-line">${addr.city}, ${addr.province} ${addr.zip}</div>
    <div class="addr-actions">
      ${!addr.isDefault ? `<button class="addr-btn addr-set-default" data-id="${addr.id}">Set Default</button>` : ''}
      <button class="addr-btn addr-edit-btn" data-id="${addr.id}">Edit</button>
      <button class="addr-btn addr-del-btn" data-id="${addr.id}">Delete</button>
    </div>
  </div>`;
}

async function saveAddresses(uid, addresses) {
  await mergeUserData(uid, { addresses });
}

function renderAddresses(addresses, uid) {
  const el = document.getElementById('accountAddresses');
  if (!el) return;
  if (!addresses || !addresses.length) {
    el.innerHTML = '<p class="account-no-orders">No saved addresses yet.</p>'; return;
  }
  el.innerHTML = addresses.map(a => renderAddressCard(a)).join('');

  el.querySelectorAll('.addr-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const addr = addresses.find(a => a.id === btn.dataset.id);
      if (addr) showAddrForm(addr);
    });
  });
  el.querySelectorAll('.addr-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this address?')) return;
      let updated = addresses.filter(a => a.id !== btn.dataset.id);
      if (!updated.some(a => a.isDefault) && updated.length > 0) updated[0].isDefault = true;
      await saveAddresses(uid, updated);
      renderAddresses(updated, uid);
    });
  });
  el.querySelectorAll('.addr-set-default').forEach(btn => {
    btn.addEventListener('click', async () => {
      const updated = addresses.map(a => ({ ...a, isDefault: a.id === btn.dataset.id }));
      await saveAddresses(uid, updated);
      renderAddresses(updated, uid);
    });
  });
}

function showAddrForm(existing = null) {
  const wrap = document.getElementById('addrFormWrap');
  if (!wrap) return;
  wrap.style.display = 'block';
  document.getElementById('addrFormTitle').textContent = existing ? 'Edit Address' : 'New Address';
  document.getElementById('addrFormId').value    = existing?.id || '';
  document.getElementById('addrLabel').value     = existing?.label     || '';
  document.getElementById('addrFirstName').value = existing?.firstName || '';
  document.getElementById('addrLastName').value  = existing?.lastName  || '';
  document.getElementById('addrPhone').value     = existing?.phone     || '';
  document.getElementById('addrStreet').value    = existing?.street    || '';
  document.getElementById('addrCity').value      = existing?.city      || '';
  document.getElementById('addrProvince').value  = existing?.province  || '';
  document.getElementById('addrZip').value       = existing?.zip       || '';
  document.getElementById('addrIsDefault').checked = existing?.isDefault || false;
  document.getElementById('addrFormError').textContent = '';
  wrap.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function hideAddrForm() {
  const wrap = document.getElementById('addrFormWrap');
  if (wrap) wrap.style.display = 'none';
}

async function handleAddrSave() {
  const user = auth.currentUser;
  if (!user) return;
  const phone = document.getElementById('addrPhone').value.trim();
  if (phone && !validatePhone(phone)) {
    document.getElementById('addrFormError').textContent = 'Phone must be 11 or 13 digits.';
    return;
  }
  const snap = await getDoc(doc(db,'users',user.uid));
  let addresses = snap.exists() ? (snap.data().addresses || []) : [];

  const id = document.getElementById('addrFormId').value || genAddrId();
  const isDefault = document.getElementById('addrIsDefault').checked;
  const newAddr = {
    id, label: document.getElementById('addrLabel').value.trim() || 'Address',
    firstName: document.getElementById('addrFirstName').value.trim() || '',
    lastName:  document.getElementById('addrLastName').value.trim()  || '',
    phone,
    street:    document.getElementById('addrStreet').value.trim()    || '',
    city:      document.getElementById('addrCity').value.trim()      || '',
    province:  document.getElementById('addrProvince').value.trim()  || '',
    zip:       document.getElementById('addrZip').value.trim()       || '',
    isDefault,
  };

  if (isDefault) addresses = addresses.map(a => ({ ...a, isDefault: false }));
  const idx = addresses.findIndex(a => a.id === id);
  if (idx >= 0) addresses[idx] = newAddr; else addresses.push(newAddr);
  if (!addresses.some(a => a.isDefault) && addresses.length > 0) addresses[0].isDefault = true;

  await saveAddresses(user.uid, addresses);
  hideAddrForm();
  renderAddresses(addresses, user.uid);
}

// ── Firestore helper ──────────────────────────────────────────────
async function mergeUserData(uid, fields) {
  const ref  = doc(db,'users',uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  await setDoc(ref, { ...existing, ...fields, updatedAt: new Date().toISOString() });
}

// ── Load orders into account panel ───────────────────────────────
async function loadOrders(uid) {
  const el = document.getElementById('accountPurchases');
  if (!el || !uid) return;
  try {
    const q = query(collection(db,'orders'), where('userId','==',uid), limit(10));
    const snap = await getDocs(q);
    if (snap.empty) { el.innerHTML = '<p class="account-no-orders">No orders yet.</p>'; return; }

    const docs = snap.docs.sort((a,b) =>
      (b.data().createdAt?.seconds||0) - (a.data().createdAt?.seconds||0));
    const methodLabels = { cod:'Cash on Delivery', gcash:'GCash', maya:'Maya' };

    el.innerHTML = docs.slice(0,10).map(d => {
      const o = d.data();
      const total  = o.total || 0;
      const status = o.status || 'pending';
      const canCancel = status === 'pending' || status === 'confirmed';
      const date = o.createdAt?.seconds
        ? new Date(o.createdAt.seconds*1000).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'})
        : '';
      return `<div class="account-order" id="order-card-${d.id}">
        <div class="account-order-header">
          <span class="account-order-id">#${d.id.slice(-8).toUpperCase()}</span>
          <span class="order-status-badge" style="background:${STATUS_COLORS[status]}">${STATUS_LABELS[status]||status}</span>
        </div>
        <div class="account-order-detail">
          ${o.items?.length||0} item(s) — ₱${total.toLocaleString('en-PH',{minimumFractionDigits:2})}
          ${date ? `<span style="color:#999"> · ${date}</span>` : ''}
        </div>
        <div class="account-order-pay">${methodLabels[o.paymentMethod]||o.paymentMethod||'—'}</div>
        ${buildTrackerHTML(status)}
        <div class="account-order-actions">
          <button class="btn-receipt-view" data-order-id="${d.id}">📄 View Receipt</button>
          ${canCancel ? `<button class="btn-order-cancel" data-order-id="${d.id}">✕ Cancel</button>` : ''}
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('.btn-receipt-view').forEach(btn => {
      btn.addEventListener('click', async () => {
        const oSnap = await getDoc(doc(db,'orders',btn.dataset.orderId));
        if (oSnap.exists()) openReceiptModal(oSnap.data(), btn.dataset.orderId);
      });
    });
    el.querySelectorAll('.btn-order-cancel').forEach(btn => {
      btn.addEventListener('click', () => cancelOrder(btn.dataset.orderId, btn));
    });
  } catch(e) { console.warn('Orders load:',e); }
}

// ── Load user data into panel ─────────────────────────────────────
async function loadUserData() {
  const user = auth.currentUser;
  if (!user) return;
  const emailEl = document.getElementById('accountEmail');
  const unameEl = document.getElementById('accountUsername');
  const inputEl = document.getElementById('usernameInput');
  if (emailEl) emailEl.textContent = user.email || '—';

  const snap = await getDoc(doc(db,'users',user.uid));
  if (snap.exists()) {
    const d = snap.data();
    if (d.username) {
      if (unameEl) unameEl.textContent = d.username;
      if (inputEl) inputEl.value = d.username;
    } else if (user.displayName) {
      if (unameEl) unameEl.textContent = user.displayName;
    }
    renderAddresses(d.addresses || [], user.uid);
  } else if (user.displayName && unameEl) {
    unameEl.textContent = user.displayName;
  }
  await loadOrders(user.uid);
}

// ── Inject account panel ──────────────────────────────────────────
function injectAccountPanel() {
  if (document.getElementById('accountPanel')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="account-overlay" id="accountOverlay"></div>
  <div class="account-panel" id="accountPanel">
    <div class="account-panel-header">
      <h3>MY ACCOUNT</h3>
      <button id="accountPanelClose">✕</button>
    </div>
    <div class="account-panel-body">
      <div class="account-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <div>
          <div class="account-email" id="accountEmail">—</div>
          <div class="account-username-wrap">
            <span id="accountUsername" class="account-username">Set username</span>
            <button class="account-edit-btn" id="usernameEditBtn">✎</button>
          </div>
        </div>
      </div>
      <div class="account-edit-row" id="usernameEditRow" style="display:none">
        <input type="text" id="usernameInput" placeholder="Enter username"/>
        <button class="btn btn-dark" id="usernameSaveBtn">SAVE</button>
      </div>

      <!-- Addresses -->
      <div class="account-section">
        <div class="account-section-head">
          <h4>MY ADDRESSES</h4>
          <button class="btn-add-addr" id="addAddressBtn">+ Add</button>
        </div>
        <div id="accountAddresses"><p class="account-no-orders">No saved addresses.</p></div>
        <div class="addr-form-wrap" id="addrFormWrap" style="display:none">
          <div class="addr-form-title" id="addrFormTitle">New Address</div>
          <input type="hidden" id="addrFormId"/>
          <div class="co-group"><label>Label</label><input type="text" id="addrLabel" placeholder="Home, Work…"/></div>
          <div class="co-row">
            <div class="co-group"><label>First Name</label><input type="text" id="addrFirstName" placeholder="Juan"/></div>
            <div class="co-group"><label>Last Name</label><input type="text" id="addrLastName" placeholder="Dela Cruz"/></div>
          </div>
          <div class="co-group">
            <label>Phone (11 or 13 digits)</label>
            <input type="tel" id="addrPhone" placeholder="09171234567" maxlength="14"/>
            <div class="addr-form-error" id="addrFormError"></div>
          </div>
          <div class="co-group"><label>Street Address</label><input type="text" id="addrStreet" placeholder="123 Rizal St., Brgy…"/></div>
          <div class="co-row">
            <div class="co-group"><label>City</label><input type="text" id="addrCity" placeholder="Pasig City"/></div>
            <div class="co-group"><label>Province</label><input type="text" id="addrProvince" placeholder="Metro Manila"/></div>
          </div>
          <div class="co-group"><label>ZIP</label><input type="text" id="addrZip" placeholder="1600"/></div>
          <div class="addr-form-check">
            <input type="checkbox" id="addrIsDefault"/>
            <label for="addrIsDefault">Set as default address</label>
          </div>
          <div class="addr-form-btns">
            <button class="btn btn-dark" id="addrSaveBtn">SAVE ADDRESS</button>
            <button class="btn btn-outline" id="addrCancelBtn">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Orders -->
      <div class="account-section">
        <h4>MY ORDERS</h4>
        <div id="accountPurchases"><p class="account-no-orders">No orders yet.</p></div>
      </div>

      <!-- Sign out -->
      <div class="account-section">
        <button class="btn btn-outline btn-full" id="accountSignOut">SIGN OUT</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(el);

  document.getElementById('accountPanelClose').addEventListener('click', closeAccountPanel);
  document.getElementById('accountOverlay').addEventListener('click', closeAccountPanel);

  document.getElementById('usernameEditBtn').addEventListener('click', () => {
    const row = document.getElementById('usernameEditRow');
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('usernameSaveBtn').addEventListener('click', async () => {
    const val = document.getElementById('usernameInput').value.trim();
    const user = auth.currentUser;
    if (!val || !user) return;
    await updateProfile(user, { displayName: val });
    await mergeUserData(user.uid, { username: val });
    document.getElementById('accountUsername').textContent = val;
    document.getElementById('usernameEditRow').style.display = 'none';
  });

  document.getElementById('accountSignOut').addEventListener('click', async () => {
    await signOut(auth); closeAccountPanel();
  });
  document.getElementById('addAddressBtn').addEventListener('click', () => showAddrForm());
  document.getElementById('addrSaveBtn').addEventListener('click', handleAddrSave);
  document.getElementById('addrCancelBtn').addEventListener('click', hideAddrForm);
  enforcePhoneDigits(document.getElementById('addrPhone'));
}

// ── Account panel open/close ──────────────────────────────────────
function openAccountPanel() {
  injectAccountPanel();
  document.getElementById('accountPanel').classList.add('open');
  document.getElementById('accountOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
  loadUserData();
}

function closeAccountPanel() {
  document.getElementById('accountPanel')?.classList.remove('open');
  document.getElementById('accountOverlay')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ── Auth modal helpers ────────────────────────────────────────────
export function openAuth(tab = 'login') {
  authModal.classList.add('open');
  authOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  switchTab(tab);
}

function closeAuth() {
  authModal.classList.remove('open');
  authOverlay.classList.remove('active');
  document.body.style.overflow = '';
  clearErrors();
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm?.classList.toggle('active', tab === 'login');
  signupForm?.classList.toggle('active', tab === 'signup');
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(el => (el.textContent = ''));
}

function showError(formEl, msg) {
  let err = formEl.querySelector('.auth-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'auth-error';
    err.style.cssText = 'color:#e53935;font-size:.8rem;margin-top:6px;text-align:center;';
    formEl.appendChild(err);
  }
  err.textContent = msg;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'PLEASE WAIT…' : btn.dataset.label;
}

// ── Nav update ────────────────────────────────────────────────────
function updateNavForUser(user) {
  const loginToggle = document.getElementById('loginToggle');
  const mobileLogin = document.getElementById('mobileLoginToggle');
  const setHandler  = (el, fn) => { if (!el) return; el.onclick = fn; };
  if (user) {
    const label = (user.displayName || user.email.split('@')[0]).toUpperCase().slice(0,10);
    loginToggle?.setAttribute('title', label);
    setHandler(loginToggle, e => { e.preventDefault(); openAccountPanel(); });
    setHandler(mobileLogin, e => { e.preventDefault(); openAccountPanel(); });
  } else {
    setHandler(loginToggle, e => { e.preventDefault(); openAuth('login'); });
    setHandler(mobileLogin, e => { e.preventDefault(); openAuth('login'); });
  }
}

// ── Admin redirect ────────────────────────────────────────────────
async function checkAdminAndRedirect(user) {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db,'users',user.uid));
    if (snap.exists() && snap.data().role === 'admin') {
      const onAdminPage = window.location.pathname.includes('admin.html');
      if (!onAdminPage) { window.location.href = 'admin.html'; return true; }
    }
  } catch(e) { console.warn('Admin check:',e); }
  return false;
}

// ── Export for checkout.js ────────────────────────────────────────
export async function getUserAddresses() {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const snap = await getDoc(doc(db,'users',user.uid));
    return snap.exists() ? (snap.data().addresses || []) : [];
  } catch(e) { return []; }
}

// ── Init ──────────────────────────────────────────────────────────
export function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab =>
    tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  document.querySelectorAll('[data-switch]').forEach(link =>
    link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.switch); }));

  authClose?.addEventListener('click', closeAuth);
  authOverlay?.addEventListener('click', closeAuth);
  document.querySelectorAll('.auth-submit').forEach(btn => { btn.dataset.label = btn.textContent; });

  // Enforce phone in signup
  const spInput = signupForm?.querySelector('#signupPhone') || signupForm?.querySelector('[placeholder*="09"]');
  if (spInput) enforcePhoneDigits(spInput);

  // ── Login ──
  const loginBtn = loginForm?.querySelector('.auth-submit');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email    = (document.getElementById('loginEmail') || loginForm.querySelector('input[type="email"]'))?.value.trim();
      const password = (document.getElementById('loginPassword') || loginForm.querySelector('input[type="password"]'))?.value;
      if (!email || !password) { showError(loginForm,'Please enter your email and password.'); return; }
      setLoading(loginBtn, true); clearErrors();
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        closeAuth();
        const isAdmin = await checkAdminAndRedirect(cred.user);
        if (!isAdmin) updateNavForUser(cred.user);
      } catch(err) {
        const msgs = {
          'auth/invalid-credential':'Incorrect email or password.',
          'auth/user-not-found':'No account found.',
          'auth/wrong-password':'Incorrect password.',
          'auth/too-many-requests':'Too many attempts. Try later.',
        };
        showError(loginForm, msgs[err.code] || 'Login failed.');
      } finally { setLoading(loginBtn, false); }
    });
  }

  // ── Sign Up ──
  const signupBtn = signupForm?.querySelector('.auth-submit');
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      // Support both ID-based and positional inputs
      const firstName = (document.getElementById('signupFirstName') || signupForm.querySelectorAll('input[type="text"]')[0])?.value.trim() || '';
      const lastName  = (document.getElementById('signupLastName')  || signupForm.querySelectorAll('input[type="text"]')[1])?.value.trim() || '';
      const phone     = (document.getElementById('signupPhone'))?.value.trim() || '';
      const email     = (document.getElementById('signupEmail')     || signupForm.querySelector('input[type="email"]'))?.value.trim();
      const pwdInputs = signupForm.querySelectorAll('input[type="password"]');
      const password  = (document.getElementById('signupPassword') || pwdInputs[0])?.value;
      const confirm   = (document.getElementById('signupConfirmPassword') || pwdInputs[1])?.value;

      if (!email || !password) { showError(signupForm,'Please fill in all required fields.'); return; }
      if (password.length < 8) { showError(signupForm,'Password must be at least 8 characters.'); return; }
      if (confirm && password !== confirm) { showError(signupForm,'Passwords do not match.'); return; }
      if (phone && !validatePhone(phone)) {
        showError(signupForm,'Phone must be 11 digits (09XXXXXXXXX) or 13 digits (+63XXXXXXXXXX).');
        return;
      }

      setLoading(signupBtn, true); clearErrors();
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
        await updateProfile(cred.user, { displayName });

        const addresses = [];
        if (phone || firstName) {
          addresses.push({
            id: 'addr_'+Date.now(), label:'Home',
            firstName, lastName, phone: phone || '',
            street:'', city:'', province:'', zip:'', isDefault: true,
          });
        }

        await setDoc(doc(db,'users',cred.user.uid), {
          email, username: displayName, phone: phone||'',
          addresses, role:'customer',
          createdAt: new Date().toISOString(),
        });

        closeAuth(); updateNavForUser(cred.user);
      } catch(err) {
        const msgs = {
          'auth/email-already-in-use':'Email already in use.',
          'auth/invalid-email':'Invalid email address.',
          'auth/weak-password':'Password is too weak.',
        };
        showError(signupForm, msgs[err.code] || 'Sign-up failed.');
      } finally { setLoading(signupBtn, false); }
    });
  }

  onAuthStateChanged(auth, async user => {
    updateNavForUser(user);
    if (user) await checkAdminAndRedirect(user);
  });
}
