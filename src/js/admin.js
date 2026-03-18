// admin.js — ALL STAR MOTOR SHOP Admin Dashboard
import {
  signOut, onAuthStateChanged, signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection, getDocs, getDoc, doc, updateDoc,
  query, orderBy, limit, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { products as localProducts } from './data.js';

// ── Auth guard ────────────────────────────────────────────────────
async function checkIsAdmin(user) {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    return snap.exists() && snap.data().role === 'admin';
  } catch (e) { return false; }
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('adminToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'adminToast'; t.className = 'admin-toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `admin-toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Navigation ────────────────────────────────────────────────────
let currentPanel = 'dashboard';

function switchPanel(name) {
  currentPanel = name;
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.toggle('active', n.dataset.panel === name));
  document.getElementById('adminTopbarTitle').textContent = {
    dashboard: 'DASHBOARD',
    orders:    'ORDERS',
    products:  'PRODUCTS',
    users:     'USERS',
  }[name] || name.toUpperCase();
  loadPanelData(name);
}

// ── Status helpers ────────────────────────────────────────────────
const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered'];
const STATUS_LABELS = {
  pending:'Pending', confirmed:'Confirmed', preparing:'Preparing',
  shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled',
};

function statusBadge(s) {
  return `<span class="status-badge ${s}">${STATUS_LABELS[s] || s}</span>`;
}

// ── DASHBOARD ─────────────────────────────────────────────────────
async function loadDashboard() {
  const el = document.getElementById('panel-dashboard');
  if (!el) return;
  el.innerHTML = `<div class="admin-stats" id="dashStats"><div class="admin-loading">Loading stats…</div></div>
    <div class="admin-section-header"><div class="admin-section-title">RECENT ORDERS</div></div>
    <div id="dashRecentOrders"><div class="admin-loading">Loading…</div></div>`;

  try {
    const [ordersSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'users')),
    ]);

    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const revenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pending = orders.filter(o => (o.status || 'pending') === 'pending').length;
    const delivered = orders.filter(o => o.status === 'delivered').length;

    document.getElementById('dashStats').innerHTML = `
      <div class="stat-card accent">
        <div class="stat-card-label">TOTAL ORDERS</div>
        <div class="stat-card-value">${orders.length}</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-card-label">PENDING</div>
        <div class="stat-card-value">${pending}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-card-label">DELIVERED</div>
        <div class="stat-card-value">${delivered}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-card-label">TOTAL USERS</div>
        <div class="stat-card-value">${usersSnap.size}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">TOTAL REVENUE</div>
        <div class="stat-card-value">₱${Math.round(revenue / 1000)}K</div>
        <div class="stat-card-sub">₱${revenue.toLocaleString('en-PH', {minimumFractionDigits:2})}</div>
      </div>`;

    const recent = orders
      .sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
      .slice(0, 5);
    renderOrdersTable(recent, 'dashRecentOrders', true);
  } catch (e) {
    document.getElementById('dashStats').innerHTML = `<div class="admin-empty">Failed to load stats.</div>`;
    console.error(e);
  }
}

// ── ORDERS ────────────────────────────────────────────────────────
let allOrders = [];

async function loadOrders() {
  const el = document.getElementById('ordersTableWrap');
  if (!el) return;
  el.innerHTML = '<div class="admin-loading">Loading orders…</div>';
  try {
    const snap = await getDocs(collection(db, 'orders'));
    allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    filterAndRenderOrders();
  } catch (e) {
    el.innerHTML = `<div class="admin-empty">Failed to load orders.</div>`;
    console.error(e);
  }
}

function filterAndRenderOrders() {
  const search = document.getElementById('ordersSearch')?.value.toLowerCase() || '';
  const status = document.getElementById('ordersFilter')?.value || 'all';
  let filtered = allOrders;
  if (status !== 'all') filtered = filtered.filter(o => (o.status||'pending') === status);
  if (search) filtered = filtered.filter(o =>
    o.id.toLowerCase().includes(search) ||
    (o.email||'').toLowerCase().includes(search) ||
    (o.address?.city||'').toLowerCase().includes(search));
  renderOrdersTable(filtered, 'ordersTableWrap', false);
}

function renderOrdersTable(orders, containerId, mini = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!orders.length) {
    el.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">📦</div>No orders found.</div>'; return;
  }
  const methodLabels = { cod:'COD', gcash:'GCash', maya:'Maya' };
  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr>
      <th>ORDER ID</th><th>EMAIL</th><th>TOTAL</th><th>PAYMENT</th>
      <th>STATUS</th>${!mini ? '<th>CHANGE STATUS</th>' : ''}<th>DETAILS</th>
    </tr></thead>
    <tbody>
      ${orders.map(o => {
        const status = o.status || 'pending';
        const date   = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('en-PH') : '—';
        const rowId  = `orow-${o.id}`;
        return `
        <tr id="${rowId}">
          <td class="cell-id">#${o.id.slice(-8).toUpperCase()}</td>
          <td>${o.email||'—'}<div class="cell-muted">${date}</div></td>
          <td>₱${(o.total||0).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
          <td>${methodLabels[o.paymentMethod]||o.paymentMethod||'—'}</td>
          <td>${statusBadge(status)}</td>
          ${!mini ? `<td>
            ${status !== 'cancelled' && status !== 'delivered' ? `
              <select class="status-select" data-order-id="${o.id}" data-current="${status}">
                ${STATUS_FLOW.map(s => `<option value="${s}" ${s===status?'selected':''}>${STATUS_LABELS[s]}</option>`).join('')}
                <option value="cancelled" ${status==='cancelled'?'selected':''}>Cancelled</option>
              </select>` : statusBadge(status)}
          </td>` : ''}
          <td>
            <button class="order-expand-btn" data-order-id="${o.id}">Details ▾</button>
          </td>
        </tr>
        <tr class="order-expand-row" id="detail-${o.id}" style="display:none">
          <td colspan="${mini ? 6 : 7}">
            <div class="order-detail-inner">
              <div class="order-detail-items">
                ${(o.items||[]).map(i=>`<div class="order-detail-item"><span>${i.name} × ${i.qty}</span><span>₱${(i.price*i.qty).toLocaleString('en-PH',{minimumFractionDigits:2})}</span></div>`).join('')}
              </div>
              <div class="order-detail-address">
                📍 ${o.address?.firstName||''} ${o.address?.lastName||''} · ${o.address?.phone||''}<br/>
                ${o.address?.street||''}, ${o.address?.city||''}, ${o.address?.province||''} ${o.address?.zip||''}
              </div>
              ${o.paymentRef ? `<div class="order-detail-ref">Payment Ref: ${o.paymentRef}</div>` : ''}
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;

  // Status change
  el.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const orderId = sel.dataset.orderId;
      const newStatus = sel.value;
      try {
        await updateDoc(doc(db,'orders',orderId), { status: newStatus });
        // Update in allOrders cache
        const idx = allOrders.findIndex(o => o.id === orderId);
        if (idx >= 0) allOrders[idx].status = newStatus;
        // Update badge in row
        const badge = document.querySelector(`#orow-${orderId} .status-badge`);
        if (badge) { badge.className = `status-badge ${newStatus}`; badge.textContent = STATUS_LABELS[newStatus]; }
        showToast(`Order #${orderId.slice(-8).toUpperCase()} → ${STATUS_LABELS[newStatus]}`);
      } catch(e) { showToast('Failed to update status', 'error'); console.error(e); }
    });
  });

  // Expand rows
  el.querySelectorAll('.order-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const detailRow = document.getElementById(`detail-${btn.dataset.orderId}`);
      if (!detailRow) return;
      const isOpen = detailRow.style.display !== 'none';
      detailRow.style.display = isOpen ? 'none' : 'table-row';
      btn.textContent = isOpen ? 'Details ▾' : 'Details ▴';
    });
  });
}

// ── PRODUCTS ──────────────────────────────────────────────────────
let productOverrides = {};

async function loadProducts() {
  const el = document.getElementById('productsTableWrap');
  if (!el) return;
  el.innerHTML = '<div class="admin-loading">Loading products…</div>';
  try {
    // Load overrides from Firestore
    const snap = await getDocs(collection(db, 'products'));
    productOverrides = {};
    snap.docs.forEach(d => { productOverrides[d.id] = d.data(); });

    const search = document.getElementById('productsSearch')?.value.toLowerCase() || '';
    let prods = localProducts;
    if (search) prods = prods.filter(p => p.name.toLowerCase().includes(search) || p.tags?.some(t => t.includes(search)));

    el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
      <thead><tr>
        <th>IMG</th><th>NAME</th><th>CATEGORY</th><th>BASE PRICE</th>
        <th>OVERRIDE PRICE</th><th>STOCK</th><th>SAVE</th>
      </tr></thead>
      <tbody>
        ${prods.map(p => {
          const ov = productOverrides[String(p.id)] || {};
          const soldOut = ov.soldOut !== undefined ? ov.soldOut : p.soldOut;
          const overridePrice = ov.price !== undefined ? ov.price : '';
          return `<tr>
            <td><img src="${p.image}" class="prod-img-thumb" alt="${p.name}" onerror="this.style.opacity=0"/></td>
            <td>${p.name} ${p.badge ? `<span class="status-badge confirmed">${p.badge}</span>` : ''}</td>
            <td class="cell-muted">${(p.tags||[]).join(', ')}</td>
            <td>₱${p.price.toLocaleString('en-PH')}</td>
            <td><input class="inline-price-input" type="number" data-prod-id="${p.id}" placeholder="₱${p.price}" value="${overridePrice}"/></td>
            <td>
              <button class="toggle-btn ${soldOut ? 'inactive' : 'active'}" data-prod-id="${p.id}" data-sold-out="${soldOut}">
                ${soldOut ? 'Sold Out' : 'In Stock'}
              </button>
            </td>
            <td><button class="save-price-btn" data-prod-id="${p.id}">SAVE</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;

    // Toggle sold out
    el.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id      = btn.dataset.prodId;
        const soldOut = btn.dataset.soldOut === 'true';
        const newSO   = !soldOut;
        try {
          await setDoc(doc(db,'products',String(id)), { soldOut: newSO }, { merge: true });
          btn.dataset.soldOut = String(newSO);
          btn.className = `toggle-btn ${newSO ? 'inactive' : 'active'}`;
          btn.textContent = newSO ? 'Sold Out' : 'In Stock';
          showToast(`Product updated`);
        } catch(e) { showToast('Failed to update', 'error'); }
      });
    });

    // Save price
    el.querySelectorAll('.save-price-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id    = btn.dataset.prodId;
        const input = el.querySelector(`.inline-price-input[data-prod-id="${id}"]`);
        const price = parseFloat(input?.value);
        if (isNaN(price) || price < 0) { showToast('Invalid price', 'error'); return; }
        try {
          await setDoc(doc(db,'products',String(id)), { price }, { merge: true });
          showToast(`Price saved: ₱${price.toLocaleString('en-PH')}`);
        } catch(e) { showToast('Failed to save price', 'error'); }
      });
    });
  } catch(e) {
    el.innerHTML = `<div class="admin-empty">Failed to load products.</div>`;
    console.error(e);
  }
}

// ── USERS ─────────────────────────────────────────────────────────
let allUsers = [];

async function loadUsers() {
  const el = document.getElementById('usersTableWrap');
  if (!el) return;
  el.innerHTML = '<div class="admin-loading">Loading users…</div>';
  try {
    const snap = await getDocs(collection(db, 'users'));
    allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    filterAndRenderUsers();
  } catch(e) {
    el.innerHTML = '<div class="admin-empty">Failed to load users.</div>';
    console.error(e);
  }
}

function filterAndRenderUsers() {
  const search = document.getElementById('usersSearch')?.value.toLowerCase() || '';
  let filtered = allUsers;
  if (search) filtered = filtered.filter(u =>
    (u.email||'').toLowerCase().includes(search) ||
    (u.username||'').toLowerCase().includes(search));

  const el = document.getElementById('usersTableWrap');
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">👤</div>No users found.</div>'; return;
  }

  el.innerHTML = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>USER</th><th>EMAIL</th><th>PHONE</th><th>ROLE</th><th>JOINED</th><th>ADDRESSES</th></tr></thead>
    <tbody>
      ${filtered.map(u => {
        const initial = (u.username || u.email || '?')[0].toUpperCase();
        const role    = u.role || 'customer';
        const joined  = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH',{year:'numeric',month:'short',day:'numeric'}) : '—';
        const addrCount = (u.addresses||[]).length;
        return `<tr>
          <td><div class="user-cell">
            <div class="user-avatar">${initial}</div>
            <span>${u.username || '—'}</span>
          </div></td>
          <td>${u.email||'—'}</td>
          <td class="cell-muted">${u.phone||'—'}</td>
          <td><span class="role-badge ${role}">${role}</span></td>
          <td class="cell-muted">${joined}</td>
          <td class="cell-muted">${addrCount} address${addrCount !== 1 ? 'es' : ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;
}

// ── Load panel data dispatcher ────────────────────────────────────
function loadPanelData(panel) {
  const map = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, users: loadUsers };
  map[panel]?.();
}

// ── Build HTML structure ──────────────────────────────────────────
function buildAdminUI(user) {
  document.body.innerHTML = `
  <div class="admin-layout">
    <!-- SIDEBAR -->
    <aside class="admin-sidebar" id="adminSidebar">
      <div class="admin-sidebar-logo">
        <img src="/ALLSTAR.png" alt="ASMS" onerror="this.style.display='none'"/>
        <div class="admin-sidebar-logo-text">
          ALL STAR
          <small>ADMIN PANEL</small>
        </div>
      </div>
      <nav class="admin-nav">
        <div class="admin-nav-section">MAIN</div>
        <div class="admin-nav-item active" data-panel="dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          Dashboard
        </div>
        <div class="admin-nav-item" data-panel="orders">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          Orders
        </div>
        <div class="admin-nav-item" data-panel="products">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>
          Products
        </div>
        <div class="admin-nav-item" data-panel="users">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Users
        </div>
      </nav>
      <div class="admin-sidebar-footer">
        <div class="admin-user-info">
          <strong>${user.email}</strong>
          Administrator
        </div>
        <button class="admin-signout" id="adminSignOut">SIGN OUT</button>
      </div>
    </aside>

    <!-- MAIN -->
    <div class="admin-main">
      <div class="admin-topbar">
        <div class="admin-topbar-title" id="adminTopbarTitle">DASHBOARD</div>
        <div class="admin-topbar-right">
          <span class="admin-badge">ADMIN</span>
          <button class="admin-refresh-btn" id="adminRefresh">↻ Refresh</button>
        </div>
      </div>
      <div class="admin-content">

        <!-- DASHBOARD PANEL -->
        <div class="admin-panel active" id="panel-dashboard">
          <div class="admin-loading">Loading dashboard…</div>
        </div>

        <!-- ORDERS PANEL -->
        <div class="admin-panel" id="panel-orders">
          <div class="admin-section-header">
            <div class="admin-section-title">ALL ORDERS</div>
          </div>
          <div class="admin-filter-row" style="margin-bottom:16px">
            <input class="admin-search" id="ordersSearch" placeholder="Search by ID, email, city…"/>
            <select class="admin-select" id="ordersFilter">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div id="ordersTableWrap"><div class="admin-loading">Loading…</div></div>
        </div>

        <!-- PRODUCTS PANEL -->
        <div class="admin-panel" id="panel-products">
          <div class="admin-section-header">
            <div class="admin-section-title">PRODUCTS</div>
          </div>
          <div class="admin-filter-row" style="margin-bottom:16px">
            <input class="admin-search" id="productsSearch" placeholder="Search products…"/>
          </div>
          <div id="productsTableWrap"><div class="admin-loading">Loading…</div></div>
          <div style="margin-top:16px;font-size:12px;color:#666;line-height:1.6">
            ℹ Price overrides and stock changes are saved to Firestore (<code>products/{id}</code>).<br/>
            The store front checks these overrides when loading product pages.
          </div>
        </div>

        <!-- USERS PANEL -->
        <div class="admin-panel" id="panel-users">
          <div class="admin-section-header">
            <div class="admin-section-title">USERS</div>
          </div>
          <div class="admin-filter-row" style="margin-bottom:16px">
            <input class="admin-search" id="usersSearch" placeholder="Search by email or username…"/>
          </div>
          <div id="usersTableWrap"><div class="admin-loading">Loading…</div></div>
        </div>

      </div>
    </div>
  </div>`;

  // Nav clicks
  document.querySelectorAll('.admin-nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.panel));
  });

  // Sign out
  document.getElementById('adminSignOut').addEventListener('click', async () => {
    await signOut(auth); window.location.href = 'index.html';
  });

  // Refresh
  document.getElementById('adminRefresh').addEventListener('click', () => loadPanelData(currentPanel));

  // Search/filter live
  setTimeout(() => {
    document.getElementById('ordersSearch')?.addEventListener('input', filterAndRenderOrders);
    document.getElementById('ordersFilter')?.addEventListener('change', filterAndRenderOrders);
    document.getElementById('productsSearch')?.addEventListener('input', loadProducts);
    document.getElementById('usersSearch')?.addEventListener('input', filterAndRenderUsers);
  }, 100);

  // Load initial panel
  loadDashboard();
}

// ── Auth screen ───────────────────────────────────────────────────
function showAuthScreen() {
  document.body.innerHTML = `
  <div class="admin-auth" id="adminAuthScreen">
    <div class="admin-auth-box">
      <div class="admin-auth-logo">ALL STAR ADMIN</div>
      <p class="admin-auth-sub">Sign in with your admin account.</p>
      <div class="admin-auth-group">
        <label>Email</label>
        <input type="email" id="adminAuthEmail" placeholder="admin@example.com"/>
      </div>
      <div class="admin-auth-group">
        <label>Password</label>
        <input type="password" id="adminAuthPassword" placeholder="••••••••"/>
      </div>
      <button class="admin-auth-btn" id="adminAuthBtn">SIGN IN</button>
      <div class="admin-auth-error" id="adminAuthError"></div>
      <div style="margin-top:16px;text-align:center">
        <a href="index.html" style="font-size:12px;color:#666;">← Back to store</a>
      </div>
    </div>
  </div>`;

  document.getElementById('adminAuthBtn').addEventListener('click', async () => {
    const email    = document.getElementById('adminAuthEmail').value.trim();
    const password = document.getElementById('adminAuthPassword').value;
    const errEl    = document.getElementById('adminAuthError');
    const btn      = document.getElementById('adminAuthBtn');
    if (!email || !password) { errEl.textContent = 'Please enter email and password.'; return; }
    btn.disabled = true; btn.textContent = 'SIGNING IN…'; errEl.textContent = '';
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const isAdmin = await checkIsAdmin(cred.user);
      if (!isAdmin) {
        await signOut(auth);
        errEl.textContent = 'Access denied. Admin accounts only.';
        btn.disabled = false; btn.textContent = 'SIGN IN';
        return;
      }
      buildAdminUI(cred.user);
    } catch(e) {
      const msgs = {
        'auth/invalid-credential':'Incorrect email or password.',
        'auth/user-not-found':'No account found.',
        'auth/wrong-password':'Incorrect password.',
        'auth/too-many-requests':'Too many attempts.',
      };
      errEl.textContent = msgs[e.code] || 'Login failed.';
      btn.disabled = false; btn.textContent = 'SIGN IN';
    }
  });

  // Allow Enter key
  document.getElementById('adminAuthPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('adminAuthBtn').click();
  });
}

// ── Entry point ───────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    const isAdmin = await checkIsAdmin(user);
    if (isAdmin) {
      buildAdminUI(user);
    } else {
      await signOut(auth);
      showAuthScreen();
    }
  } else {
    showAuthScreen();
  }
});
