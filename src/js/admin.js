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
    sales:     'SALES REPORT',
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

// ── SALES REPORT ──────────────────────────────────────────────────
let salesChart = null;
let currentSalesPeriod = 'daily';

function getSalesPeriodBounds(period) {
  const now = new Date();
  if (period === 'daily') {
    const start = new Date(now); start.setHours(0,0,0,0);
    return { start, label: 'Today', chartLabel: 'Last 7 Days', chartUnit: 'day', chartCount: 7 };
  }
  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
    return { start, label: 'This Week', chartLabel: 'Last 4 Weeks', chartUnit: 'week', chartCount: 4 };
  }
  // monthly
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, label: 'This Month', chartLabel: 'Last 12 Months', chartUnit: 'month', chartCount: 12 };
}

function buildChartData(orders, period) {
  const now = new Date();
  const labels = [];
  const data   = [];
  const counts = [];

  if (period === 'daily') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
      const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
      labels.push(d.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric' }));
      const dayOrders = orders.filter(o => {
        const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : null;
        return ts && ts >= d.getTime() && ts <= dEnd.getTime();
      });
      data.push(dayOrders.reduce((s, o) => s + (o.total || 0), 0));
      counts.push(dayOrders.length);
    }
  } else if (period === 'weekly') {
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - i * 7); weekStart.setHours(0,0,0,0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);
      labels.push(`Wk of ${weekStart.toLocaleDateString('en-PH', { month:'short', day:'numeric' })}`);
      const wkOrders = orders.filter(o => {
        const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : null;
        return ts && ts >= weekStart.getTime() && ts <= weekEnd.getTime();
      });
      data.push(wkOrders.reduce((s, o) => s + (o.total || 0), 0));
      counts.push(wkOrders.length);
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      labels.push(mStart.toLocaleDateString('en-PH', { month:'short', year:'2-digit' }));
      const mOrders = orders.filter(o => {
        const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : null;
        return ts && ts >= mStart.getTime() && ts <= mEnd.getTime();
      });
      data.push(mOrders.reduce((s, o) => s + (o.total || 0), 0));
      counts.push(mOrders.length);
    }
  }
  return { labels, data, counts };
}

function renderSalesChart(chartData) {
  const canvas = document.getElementById('salesChartCanvas');
  if (!canvas) return;
  if (salesChart) { salesChart.destroy(); salesChart = null; }

  const maxVal = Math.max(...chartData.data, 1);

  salesChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Revenue (₱)',
        data: chartData.data,
        backgroundColor: chartData.data.map((v, i) =>
          i === chartData.data.length - 1 ? 'rgba(212,68,10,0.85)' : 'rgba(212,68,10,0.35)'),
        borderColor: 'rgba(212,68,10,0.9)',
        borderWidth: 1,
        borderRadius: 2,
      }, {
        label: 'Orders',
        data: chartData.counts,
        type: 'line',
        borderColor: 'rgba(34,197,94,0.8)',
        backgroundColor: 'rgba(34,197,94,0.1)',
        tension: 0.3,
        pointBackgroundColor: '#22c55e',
        pointRadius: 4,
        yAxisID: 'y2',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#888', font: { family: "'Barlow Condensed', sans-serif", size: 12, weight: '600' }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#1c1c1c',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#e8e8e8',
          bodyColor: '#888',
          callbacks: {
            label: ctx => ctx.dataset.label === 'Revenue (₱)'
              ? ` ₱${ctx.parsed.y.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
              : ` ${ctx.parsed.y} order${ctx.parsed.y !== 1 ? 's' : ''}`,
          }
        }
      },
      scales: {
        x: { ticks: { color: '#666', font: { family: "'Barlow Condensed', sans-serif", size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#666', font: { family: "'Barlow Condensed', sans-serif", size: 11 }, callback: v => '₱' + (v >= 1000 ? (v/1000).toFixed(1)+'K' : v) }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true },
        y2: { position: 'right', ticks: { color: '#22c55e', font: { size: 11 } }, grid: { display: false }, beginAtZero: true },
      }
    }
  });
}

async function loadSalesReport(period = 'daily') {
  currentSalesPeriod = period;

  // Update tab buttons
  document.querySelectorAll('.sales-period-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.period === period));

  const bounds = getSalesPeriodBounds(period);
  const statsEl = document.getElementById('salesStats');
  const chartEl = document.getElementById('salesChartWrap');
  const tableEl = document.getElementById('salesTableWrap');
  if (!statsEl) return;

  statsEl.innerHTML = `<div class="admin-loading">Loading sales data…</div>`;
  if (chartEl) chartEl.style.opacity = '0.4';

  try {
    const snap = await getDocs(collection(db, 'orders'));
    const allOrds = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter for selected period
    const periodOrders = allOrds.filter(o => {
      const ts = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : null;
      return ts && ts >= bounds.start.getTime();
    });

    const revenue     = periodOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder    = periodOrders.length ? revenue / periodOrders.length : 0;
    const delivered   = periodOrders.filter(o => o.status === 'delivered').length;
    const cancelled   = periodOrders.filter(o => o.status === 'cancelled').length;

    // Top product
    const productCounts = {};
    periodOrders.forEach(o => (o.items||[]).forEach(i => {
      productCounts[i.name] = (productCounts[i.name] || 0) + (i.qty || 1);
    }));
    const topProduct = Object.entries(productCounts).sort((a,b)=>b[1]-a[1])[0];

    statsEl.innerHTML = `
      <div class="stat-card accent">
        <div class="stat-card-label">REVENUE (${bounds.label.toUpperCase()})</div>
        <div class="stat-card-value">₱${revenue >= 1000 ? (revenue/1000).toFixed(1)+'K' : revenue.toFixed(0)}</div>
        <div class="stat-card-sub">₱${revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-card-label">ORDERS</div>
        <div class="stat-card-value">${periodOrders.length}</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-card-label">AVG ORDER VALUE</div>
        <div class="stat-card-value">₱${Math.round(avgOrder).toLocaleString('en-PH')}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-card-label">DELIVERED</div>
        <div class="stat-card-value">${delivered}</div>
      </div>
      <div class="stat-card" style="border-color:rgba(239,68,68,0.25)">
        <div class="stat-card-label">CANCELLED</div>
        <div class="stat-card-value" style="color:var(--admin-red)">${cancelled}</div>
      </div>
      <div class="stat-card" style="border-color:rgba(139,92,246,0.25)">
        <div class="stat-card-label">TOP PRODUCT</div>
        <div class="stat-card-value" style="color:var(--admin-purple);font-size:18px;line-height:1.2">${topProduct ? topProduct[0] : '—'}</div>
        ${topProduct ? `<div class="stat-card-sub">${topProduct[1]} unit${topProduct[1]!==1?'s':''} sold</div>` : ''}
      </div>`;

    // Chart
    if (chartEl) chartEl.style.opacity = '1';
    const chartData = buildChartData(allOrds, period);
    renderSalesChart(chartData);

    // Orders table
    const sorted = periodOrders.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    if (!tableEl) return;
    if (!sorted.length) {
      tableEl.innerHTML = `<div class="admin-empty"><div class="admin-empty-icon">📊</div>No orders found for ${bounds.label.toLowerCase()}.</div>`;
      return;
    }
    tableEl.innerHTML = `
      <div class="admin-section-header" style="margin-top:28px;margin-bottom:12px">
        <div class="admin-section-title">ORDERS — ${bounds.label.toUpperCase()}</div>
        <div style="font-size:12px;color:var(--admin-muted)">${sorted.length} order${sorted.length!==1?'s':''}</div>
      </div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr>
          <th>ORDER ID</th><th>EMAIL</th><th>DATE</th><th>ITEMS</th><th>TOTAL</th><th>PAYMENT</th><th>STATUS</th>
        </tr></thead>
        <tbody>
          ${sorted.map(o => {
            const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
            const itemCount = (o.items||[]).reduce((s,i)=>s+(i.qty||1),0);
            const methodLabels = { cod:'COD', gcash:'GCash', maya:'Maya' };
            return `<tr>
              <td class="cell-id">#${o.id.slice(-8).toUpperCase()}</td>
              <td>${o.email||'—'}</td>
              <td class="cell-muted">${date}</td>
              <td class="cell-muted">${itemCount} item${itemCount!==1?'s':''}</td>
              <td>₱${(o.total||0).toLocaleString('en-PH',{minimumFractionDigits:2})}</td>
              <td class="cell-muted">${methodLabels[o.paymentMethod]||o.paymentMethod||'—'}</td>
              <td>${statusBadge(o.status||'pending')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;

  } catch(e) {
    statsEl.innerHTML = `<div class="admin-empty">Failed to load sales data.</div>`;
    console.error(e);
  }
}

// ── Load panel data dispatcher ────────────────────────────────────
function loadPanelData(panel) {
  const map = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, users: loadUsers, sales: () => loadSalesReport(currentSalesPeriod) };
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
        <div class="admin-nav-item" data-panel="sales">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Sales Report
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

        <!-- SALES REPORT PANEL -->
        <div class="admin-panel" id="panel-sales">
          <div class="admin-section-header">
            <div class="admin-section-title">SALES REPORT</div>
            <div class="sales-period-tabs">
              <button class="sales-period-btn active" data-period="daily">Daily</button>
              <button class="sales-period-btn" data-period="weekly">Weekly</button>
              <button class="sales-period-btn" data-period="monthly">Monthly</button>
            </div>
          </div>
          <div class="admin-stats" id="salesStats">
            <div class="admin-loading">Loading sales data…</div>
          </div>
          <div class="sales-chart-section" id="salesChartWrap">
            <div class="sales-chart-label" id="salesChartLabel">REVENUE TREND</div>
            <div class="sales-chart-container">
              <canvas id="salesChartCanvas"></canvas>
            </div>
          </div>
          <div id="salesTableWrap"></div>
        </div>

      </div>
    </div>
  </div>`;

  // Nav clicks
  document.querySelectorAll('.admin-nav-item[data-panel]').forEach(item => {
    item.addEventListener('click', () => switchPanel(item.dataset.panel));
  });

  // Sales period tabs (use event delegation since panel may re-render)
  document.getElementById('panel-sales')?.addEventListener('click', e => {
    const btn = e.target.closest('.sales-period-btn');
    if (btn) loadSalesReport(btn.dataset.period);
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
