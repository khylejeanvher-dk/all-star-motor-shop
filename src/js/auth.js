// auth.js — Firebase Auth + Account Panel
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase.js';

// ── DOM refs 
const authModal   = document.getElementById('authModal');
const authOverlay = document.getElementById('authOverlay');
const authClose   = document.getElementById('authClose');
const loginForm   = document.getElementById('loginForm');
const signupForm  = document.getElementById('signupForm');

// ── Account Panel (injected dynamically) 
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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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

      <div class="account-section">
        <h4>CONTACT & ADDRESS</h4>
        <div class="co-group"><label>Phone Number</label><input type="tel" id="accPhone" placeholder="+63 917 000 0000"/></div>
        <div class="co-group"><label>Street Address</label><input type="text" id="accStreet" placeholder="123 Rizal St."/></div>
        <div class="co-group"><label>City</label><input type="text" id="accCity" placeholder="Pasig City"/></div>
        <div class="co-group"><label>Province</label><input type="text" id="accProvince" placeholder="Metro Manila"/></div>
        <div class="co-group"><label>ZIP Code</label><input type="text" id="accZip" placeholder="1600"/></div>
        <button class="btn btn-dark" id="accSaveAddr">SAVE ADDRESS</button>
        <div class="account-save-msg" id="accSaveMsg"></div>
      </div>

      <div class="account-section">
        <h4>RECENT PURCHASES</h4>
        <div id="accountPurchases"><p class="account-no-orders">No orders yet.</p></div>
      </div>

      <div class="account-section">
        <button class="btn btn-outline btn-full" id="accountSignOut">SIGN OUT</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(el);

  // Wire close
  document.getElementById('accountPanelClose').addEventListener('click', closeAccountPanel);
  document.getElementById('accountOverlay').addEventListener('click', closeAccountPanel);

  // Username edit
  document.getElementById('usernameEditBtn').addEventListener('click', () => {
    const row = document.getElementById('usernameEditRow');
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
  });
  document.getElementById('usernameSaveBtn').addEventListener('click', async () => {
    const val = document.getElementById('usernameInput').value.trim();
    if (!val) return;
    const user = auth.currentUser;
    if (!user) return;
    await updateProfile(user, { displayName: val });
    await saveUserData({ username: val });
    document.getElementById('accountUsername').textContent = val;
    document.getElementById('usernameEditRow').style.display = 'none';
  });

  // Save address
  document.getElementById('accSaveAddr').addEventListener('click', async () => {
    const data = {
      phone:    document.getElementById('accPhone').value.trim(),
      street:   document.getElementById('accStreet').value.trim(),
      city:     document.getElementById('accCity').value.trim(),
      province: document.getElementById('accProvince').value.trim(),
      zip:      document.getElementById('accZip').value.trim(),
    };
    await saveUserData(data);
    const msg = document.getElementById('accSaveMsg');
    msg.textContent = '✓ Saved!';
    setTimeout(() => (msg.textContent = ''), 2000);
  });

  // Sign out
  document.getElementById('accountSignOut').addEventListener('click', async () => {
    await signOut(auth);
    closeAccountPanel();
  });
}

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

async function saveUserData(fields) {
  const user = auth.currentUser;
  if (!user) return;
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  await setDoc(ref, { ...existing, ...fields, updatedAt: new Date().toISOString() });
}

async function loadUserData() {
  const user = auth.currentUser;
  if (!user) return;
  document.getElementById('accountEmail').textContent = user.email || '—';
  if (user.displayName) {
    document.getElementById('accountUsername').textContent = user.displayName;
    document.getElementById('usernameInput').value = user.displayName;
  }

  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    if (d.username)  document.getElementById('accountUsername').textContent = d.username;
    if (d.phone)     document.getElementById('accPhone').value    = d.phone;
    if (d.street)    document.getElementById('accStreet').value   = d.street;
    if (d.city)      document.getElementById('accCity').value     = d.city;
    if (d.province)  document.getElementById('accProvince').value = d.province;
    if (d.zip)       document.getElementById('accZip').value      = d.zip;
  }

  // Load recent orders (no orderBy to avoid requiring a Firestore index)
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      limit(10)
    );
    const snap2 = await getDocs(q);
    const purchasesEl = document.getElementById('accountPurchases');
    if (!purchasesEl) return;
    if (snap2.empty) {
      purchasesEl.innerHTML = '<p class="account-no-orders">No orders yet.</p>';
    } else {
      // Sort client-side by createdAt descending
      const docs = snap2.docs.sort((a, b) => {
        const ta = a.data().createdAt?.seconds || 0;
        const tb = b.data().createdAt?.seconds || 0;
        return tb - ta;
      });
      purchasesEl.innerHTML = docs.slice(0, 5).map(d => {
        const o = d.data();
        const total = o.total || 0;
        const methodLabels = { cod: 'Cash on Delivery', gcash: 'GCash', maya: 'Maya' };
        return `<div class="account-order">
          <div class="account-order-id">#${d.id.slice(-8).toUpperCase()}</div>
          <div class="account-order-detail">${o.items?.length || 0} item(s) — ₱${total.toLocaleString('en-PH',{minimumFractionDigits:2})}</div>
          <div class="account-order-pay">${methodLabels[o.paymentMethod] || o.paymentMethod || '—'}</div>
        </div>`;
      }).join('');
    }
  } catch(e) { console.warn('Orders load:', e); }
}

// ── Auth helpers 
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
  loginForm.classList.toggle('active',  tab === 'login');
  signupForm.classList.toggle('active', tab === 'signup');
  clearErrors();
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(el => (el.textContent = ''));
}

function showError(formEl, msg) {
  let err = formEl.querySelector('.auth-error');
  if (!err) { err = Object.assign(document.createElement('p'), { className: 'auth-error' }); err.style.cssText='color:#e53935;font-size:.8rem;margin-top:6px;text-align:center;'; formEl.appendChild(err); }
  err.textContent = msg;
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'PLEASE WAIT…' : btn.dataset.label;
}

function updateNavForUser(user) {
  const loginToggle = document.getElementById('loginToggle');
  const mobileLogin = document.getElementById('mobileLoginToggle');
  const setHandler  = (el, fn) => { if (!el) return; el.onclick = fn; };

  if (user) {
    const label = (user.displayName || user.email.split('@')[0]).toUpperCase().slice(0, 10);
    if (loginToggle) loginToggle.setAttribute('title', label);
    setHandler(loginToggle, e => { e.preventDefault(); openAccountPanel(); });
    setHandler(mobileLogin, e => { e.preventDefault(); openAccountPanel(); });
  } else {
    setHandler(loginToggle, e => { e.preventDefault(); openAuth('login'); });
    setHandler(mobileLogin, e => { e.preventDefault(); openAuth('login'); });
  }
}

// ── Init 
export function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  document.querySelectorAll('[data-switch]').forEach(link => link.addEventListener('click', e => { e.preventDefault(); switchTab(link.dataset.switch); }));
  authClose.addEventListener('click', closeAuth);
  authOverlay.addEventListener('click', closeAuth);
  document.querySelectorAll('.auth-submit').forEach(btn => { btn.dataset.label = btn.textContent; });

  // Login
  const loginBtn = loginForm?.querySelector('.auth-submit');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email    = loginForm.querySelector('input[type="email"]')?.value.trim();
      const password = loginForm.querySelector('input[type="password"]')?.value;
      if (!email || !password) { showError(loginForm, 'Please enter your email and password.'); return; }
      setLoading(loginBtn, true); clearErrors();
      try { await signInWithEmailAndPassword(auth, email, password); closeAuth(); }
      catch (err) {
        const msgs = { 'auth/invalid-credential':'Incorrect email or password.','auth/user-not-found':'No account found.','auth/wrong-password':'Incorrect password.','auth/too-many-requests':'Too many attempts. Try later.' };
        showError(loginForm, msgs[err.code] || 'Login failed.');
      } finally { setLoading(loginBtn, false); }
    });
  }

  // Sign up
  const signupBtn = signupForm?.querySelector('.auth-submit');
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email    = signupForm.querySelector('input[type="email"]')?.value.trim();
      const password = signupForm.querySelector('input[type="password"]')?.value;
      if (!email || !password) { showError(signupForm, 'Please fill in all fields.'); return; }
      if (password.length < 8)  { showError(signupForm, 'Password must be at least 8 characters.'); return; }
      setLoading(signupBtn, true); clearErrors();
      try { await createUserWithEmailAndPassword(auth, email, password); closeAuth(); }
      catch (err) {
        const msgs = { 'auth/email-already-in-use':'Email already in use.','auth/invalid-email':'Invalid email.','auth/weak-password':'Password too weak.' };
        showError(signupForm, msgs[err.code] || 'Sign-up failed.');
      } finally { setLoading(signupBtn, false); }
    });
  }

  onAuthStateChanged(auth, updateNavForUser);
}
