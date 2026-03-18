// checkout.js — Multi-step checkout with address selector, QR payment simulation
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db }       from './firebase.js';
import { getCart, clearCart } from './cart.js';
import { getUserAddresses }   from './auth.js';

// ── QR Code SVG generator ────────────────────────────────────────
function generateQRSVG(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }

  const sz = 21, cell = 8, pad = 4, total = sz * cell + pad * 2;
  const grid = Array.from({ length: sz }, () => Array(sz).fill(0));

  // Finder patterns
  function finder(row, col) {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const onBorder = r===0||r===6||c===0||c===6;
      const inCenter = r>=2&&r<=4&&c>=2&&c<=4;
      if (row+r < sz && col+c < sz) grid[row+r][col+c] = (onBorder||inCenter) ? 1 : 2;
    }
  }
  finder(0,0); finder(0,sz-7); finder(sz-7,0);

  // Fill data area randomly
  for (let r = 0; r < sz; r++) for (let c = 0; c < sz; c++) {
    if (grid[r][c] === 0) grid[r][c] = rnd() > 0.5 ? 1 : 0;
  }

  const rects = [];
  for (let r = 0; r < sz; r++) for (let c = 0; c < sz; c++) {
    if (grid[r][c] === 1)
      rects.push(`<rect x="${pad+c*cell}" y="${pad+r*cell}" width="${cell}" height="${cell}" fill="#111"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}">
    <rect width="${total}" height="${total}" fill="white"/>
    ${rects.join('')}
  </svg>`;
}

function genPayRef() {
  return 'AS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}

// ── Inject modal HTML ────────────────────────────────────────────
function injectCheckoutModal() {
  if (document.getElementById('checkoutModal')) return;
  const el = document.createElement('div');
  el.innerHTML = `
  <div class="checkout-overlay" id="checkoutOverlay"></div>
  <div class="checkout-modal" id="checkoutModal">
    <button class="checkout-close" id="checkoutClose">✕</button>
    <div class="checkout-steps">
      <div class="checkout-step-indicator" id="checkoutSteps">
        <span class="csi active" data-step="1">1 ADDRESS</span>
        <span class="csi-sep">›</span>
        <span class="csi" data-step="2">2 PAYMENT</span>
        <span class="csi-sep">›</span>
        <span class="csi" data-step="3">3 RECEIPT</span>
      </div>
    </div>

    <!-- STEP 1: Address -->
    <div class="checkout-panel active" id="coStep1">
      <h2 class="co-title">DELIVERY ADDRESS</h2>

      <!-- Saved addresses selector -->
      <div id="coSavedAddrWrap" style="display:none">
        <div class="co-saved-addr-label">Your saved addresses</div>
        <div id="coAddrList" class="co-addr-list"></div>
        <button class="co-new-addr-toggle" id="coNewAddrToggle">+ Use a different address</button>
        <hr class="co-divider"/>
      </div>

      <!-- Address form -->
      <div class="co-form" id="coAddrForm">
        <div class="co-row">
          <div class="co-group"><label>FIRST NAME</label><input id="coFirstName" type="text" placeholder="Juan"/></div>
          <div class="co-group"><label>LAST NAME</label><input id="coLastName" type="text" placeholder="Dela Cruz"/></div>
        </div>
        <div class="co-group">
          <label>PHONE NUMBER <span style="font-size:10px;color:#999">(11 or 13 digits)</span></label>
          <input id="coPhone" type="tel" placeholder="09171234567" maxlength="14"/>
          <div class="co-field-hint" id="coPhoneHint"></div>
        </div>
        <div class="co-group"><label>STREET ADDRESS</label><input id="coStreet" type="text" placeholder="123 Rizal St., Brgy. San Antonio"/></div>
        <div class="co-row">
          <div class="co-group"><label>CITY / MUNICIPALITY</label><input id="coCity" type="text" placeholder="Pasig City"/></div>
          <div class="co-group"><label>PROVINCE</label><input id="coProvince" type="text" placeholder="Metro Manila"/></div>
        </div>
        <div class="co-group"><label>ZIP CODE</label><input id="coZip" type="text" placeholder="1600"/></div>
      </div>

      <div class="co-error" id="coError1"></div>
      <button class="btn btn-dark btn-full co-next" id="coNext1">CONTINUE TO PAYMENT →</button>
    </div>

    <!-- STEP 2: Payment -->
    <div class="checkout-panel" id="coStep2">
      <h2 class="co-title">PAYMENT METHOD</h2>

      <div class="co-payment-grid">
        <label class="co-pay-option">
          <input type="radio" name="payMethod" value="cod" checked>
          <div class="co-pay-card">
            <span class="co-pay-icon">💵</span>
            <div><strong>Cash on Delivery</strong><p>Pay when your order arrives</p></div>
          </div>
        </label>
        <label class="co-pay-option">
          <input type="radio" name="payMethod" value="gcash">
          <div class="co-pay-card">
            <span class="co-pay-icon" style="background:#0070e0;color:#fff;border-radius:8px;padding:4px 6px;font-size:14px">G</span>
            <div><strong>GCash</strong><p>Scan QR to send payment (demo)</p></div>
          </div>
        </label>
        <label class="co-pay-option">
          <input type="radio" name="payMethod" value="maya">
          <div class="co-pay-card">
            <span class="co-pay-icon" style="background:#2eb872;color:#fff;border-radius:8px;padding:4px 6px;font-size:14px">M</span>
            <div><strong>Maya</strong><p>Scan QR to send payment (demo)</p></div>
          </div>
        </label>
      </div>

      <!-- QR Payment box (GCash / Maya) -->
      <div class="co-qr-box" id="coQrBox" style="display:none">
        <div class="co-qr-header" id="coQrHeader"></div>
        <div class="co-qr-code" id="coQrCode"></div>
        <div class="co-qr-ref">Reference: <strong id="coQrRef"></strong></div>
        <div class="co-qr-amount">Amount: <strong id="coQrAmount"></strong></div>
        <div class="co-qr-note">⚠ This is a demo simulation. No real payment will be processed.</div>
        <div class="co-qr-status" id="coQrStatus"></div>
        <button class="btn btn-dark btn-full" id="coIvePaid" style="margin-top:14px">✓ I'VE SENT THE PAYMENT</button>
      </div>

      <div class="co-order-summary" id="coOrderSummary"></div>

      <div class="co-btn-row">
        <button class="btn btn-outline co-back" id="coBack2">← BACK</button>
        <button class="btn btn-dark co-place" id="coPlaceOrder">PLACE ORDER →</button>
      </div>
    </div>

    <!-- STEP 3: Receipt -->
    <div class="checkout-panel" id="coStep3">
      <div class="co-receipt">
        <div class="co-receipt-icon">✓</div>
        <h2 class="co-title">ORDER PLACED!</h2>
        <p class="co-sub" id="coReceiptSub">Thank you for your order.</p>
        <div class="co-receipt-details" id="coReceiptDetails"></div>
        <button class="btn btn-dark btn-full" id="coDone">DONE</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(el);
}

// ── Step management ──────────────────────────────────────────────
function goToStep(n) {
  document.querySelectorAll('.checkout-panel').forEach((p, i) =>
    p.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.csi').forEach(s => {
    s.classList.toggle('active', +s.dataset.step === n);
    s.classList.toggle('done',   +s.dataset.step < n);
  });
}

// ── Phone enforcement in checkout ─────────────────────────────────
function enforceCoPhone() {
  const input = document.getElementById('coPhone');
  if (!input || input.dataset.phoneEnforced) return;
  input.dataset.phoneEnforced = '1';
  input.addEventListener('input', () => {
    let val = input.value, result = '';
    for (let i = 0; i < val.length; i++) {
      if (i === 0 && val[i] === '+') result += '+';
      else if (/\d/.test(val[i])) result += val[i];
    }
    input.value = result;
    const digits = result.replace(/\D/g,'');
    const hint = document.getElementById('coPhoneHint');
    if (result.length > 0 && digits.length !== 11 && digits.length !== 13) {
      if (hint) { hint.textContent = `${digits.length} digits — needs 11 or 13`; hint.style.color='#e53935'; }
    } else {
      if (hint) hint.textContent = '';
    }
  });
}

// ── Fill checkout form from address object ─────────────────────────
function fillFormFromAddress(addr) {
  if (!addr) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('coFirstName', addr.firstName);
  set('coLastName',  addr.lastName);
  set('coPhone',     addr.phone);
  set('coStreet',    addr.street);
  set('coCity',      addr.city);
  set('coProvince',  addr.province);
  set('coZip',       addr.zip);
}

// ── Load saved addresses into checkout step 1 ─────────────────────
async function loadCheckoutAddresses() {
  const addresses = await getUserAddresses();
  const wrap = document.getElementById('coSavedAddrWrap');
  const list = document.getElementById('coAddrList');
  const form = document.getElementById('coAddrForm');
  if (!wrap || !list) return;

  if (!addresses.length) {
    wrap.style.display = 'none';
    form.style.display = 'flex';
    return;
  }

  wrap.style.display = 'block';
  const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
  let selectedId = defaultAddr.id;

  // Render address radio cards
  list.innerHTML = addresses.map(a => `
    <label class="co-addr-card ${a.id === selectedId ? 'selected' : ''}">
      <input type="radio" name="savedAddr" value="${a.id}" ${a.id === selectedId ? 'checked' : ''}/>
      <div class="co-addr-info">
        <div class="co-addr-label-tag">${a.label || 'Address'}</div>
        <div><strong>${a.firstName} ${a.lastName}</strong> · ${a.phone}</div>
        <div>${a.street}, ${a.city}, ${a.province} ${a.zip}</div>
      </div>
    </label>
  `).join('');

  // Show form pre-filled with selected address
  fillFormFromAddress(defaultAddr);
  form.style.display = 'flex';
  // Collapse form initially (show summary)
  form.classList.add('co-form-collapsed');

  // When a saved address is selected, fill form
  list.querySelectorAll('input[name="savedAddr"]').forEach(radio => {
    radio.addEventListener('change', () => {
      list.querySelectorAll('.co-addr-card').forEach(c => c.classList.remove('selected'));
      radio.closest('.co-addr-card').classList.add('selected');
      selectedId = radio.value;
      const addr = addresses.find(a => a.id === radio.value);
      fillFormFromAddress(addr);
      form.classList.remove('co-form-collapsed');
    });
  });

  // Toggle to show/edit form
  document.getElementById('coNewAddrToggle')?.addEventListener('click', () => {
    form.classList.toggle('co-form-collapsed');
    const isCollapsed = form.classList.contains('co-form-collapsed');
    const btn = document.getElementById('coNewAddrToggle');
    btn.textContent = isCollapsed ? '+ Use a different address' : '— Hide address form';
  });
}

// ── Payment ref state ─────────────────────────────────────────────
let currentPayRef = '';
let paymentConfirmed = false;

function setupQRPayment() {
  const qrBox    = document.getElementById('coQrBox');
  const placeBtn = document.getElementById('coPlaceOrder');

  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const method = radio.value;
      if (method === 'gcash' || method === 'maya') {
        const ref   = genPayRef();
        currentPayRef = ref;
        paymentConfirmed = false;
        const cart  = getCart();
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const label = method === 'gcash' ? 'GCash' : 'Maya';
        const color = method === 'gcash' ? '#0070e0' : '#2eb872';

        document.getElementById('coQrHeader').innerHTML =
          `<span style="color:${color};font-weight:700;font-size:18px">${label} Payment</span>
           <div style="font-size:12px;color:#666;margin-top:2px">Scan with your ${label} app</div>`;
        document.getElementById('coQrCode').innerHTML   = generateQRSVG(ref + method);
        document.getElementById('coQrRef').textContent  = ref;
        document.getElementById('coQrAmount').textContent = `₱${total.toLocaleString('en-PH',{minimumFractionDigits:2})}`;
        document.getElementById('coQrStatus').textContent = '';
        document.getElementById('coIvePaid').disabled  = false;
        document.getElementById('coIvePaid').textContent = '✓ I\'VE SENT THE PAYMENT';
        qrBox.style.display  = 'block';
        placeBtn.style.display = 'none';
      } else {
        qrBox.style.display    = 'none';
        placeBtn.style.display = 'block';
        paymentConfirmed = false;
        currentPayRef = '';
      }
    });
  });

  // "I've paid" button
  document.getElementById('coIvePaid')?.addEventListener('click', async () => {
    const btn = document.getElementById('coIvePaid');
    btn.disabled = true;
    btn.textContent = 'Verifying…';
    // Simulate verification delay
    await new Promise(r => setTimeout(r, 1500));
    btn.textContent = '✓ Payment Received!';
    btn.style.background = '#22c55e';
    document.getElementById('coQrStatus').innerHTML =
      '<span style="color:#22c55e;font-size:13px">✓ Payment simulation confirmed!</span>';
    paymentConfirmed = true;
    placeBtn.style.display = 'block';
    placeBtn.textContent   = 'PLACE ORDER →';
  });
}

// ── Render order summary ──────────────────────────────────────────
function renderOrderSummary() {
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const el    = document.getElementById('coOrderSummary');
  if (!el) return;
  el.innerHTML = `
    <h4>ORDER SUMMARY</h4>
    ${cart.map(i => `
      <div class="co-summary-row">
        <span>${i.name} × ${i.qty}</span>
        <span>₱${(i.price * i.qty).toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
      </div>`).join('')}
    <div class="co-summary-total">
      <span>TOTAL</span>
      <span>₱${total.toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
    </div>`;
}

// ── Show receipt (step 3) ─────────────────────────────────────────
function showReceipt(order, orderId) {
  const methodLabels = { cod:'Cash on Delivery', gcash:'GCash', maya:'Maya' };
  document.getElementById('coReceiptSub').textContent =
    `Your order has been received. We'll contact you at ${order.address.phone} to confirm delivery.`;
  document.getElementById('coReceiptDetails').innerHTML = `
    <div class="co-receipt-row"><span>Order ID</span><span>#${orderId.slice(-8).toUpperCase()}</span></div>
    <div class="co-receipt-row"><span>Payment</span><span>${methodLabels[order.paymentMethod]}</span></div>
    ${order.paymentRef ? `<div class="co-receipt-row"><span>Payment Ref</span><span>${order.paymentRef}</span></div>` : ''}
    <div class="co-receipt-row"><span>Deliver to</span><span>${order.address.street}, ${order.address.city}</span></div>
    <div class="co-receipt-divider"></div>
    ${order.items.map(i => `
      <div class="co-receipt-row">
        <span>${i.name} × ${i.qty}</span>
        <span>₱${(i.price * i.qty).toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
      </div>`).join('')}
    <div class="co-receipt-row co-receipt-total">
      <span>TOTAL</span>
      <span>₱${order.total.toLocaleString('en-PH',{minimumFractionDigits:2})}</span>
    </div>`;
}

// ── Init ─────────────────────────────────────────────────────────
export function initCheckout() {
  injectCheckoutModal();

  const modal   = document.getElementById('checkoutModal');
  const overlay = document.getElementById('checkoutOverlay');

  async function openCheckout() {
    injectCheckoutModal();
    goToStep(1);
    modal.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Reset QR state
    paymentConfirmed = false; currentPayRef = '';
    const qrBox = document.getElementById('coQrBox');
    if (qrBox) qrBox.style.display = 'none';
    const placeBtn = document.getElementById('coPlaceOrder');
    if (placeBtn) placeBtn.style.display = 'block';
    // Reset payment to COD
    document.querySelector('input[name="payMethod"][value="cod"]').checked = true;
    renderOrderSummary();
    enforceCoPhone();
    await loadCheckoutAddresses();
  }

  function closeCheckout() {
    modal.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  window.openCheckout = openCheckout;

  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  overlay.addEventListener('click', closeCheckout);

  // Step 1 → 2
  document.getElementById('coNext1').addEventListener('click', () => {
    const fn  = document.getElementById('coFirstName').value.trim();
    const ln  = document.getElementById('coLastName').value.trim();
    const ph  = document.getElementById('coPhone').value.trim();
    const st  = document.getElementById('coStreet').value.trim();
    const ci  = document.getElementById('coCity').value.trim();
    const err = document.getElementById('coError1');

    if (!fn || !ln || !st || !ci) { err.textContent = 'Please fill in all required fields.'; return; }
    if (!ph) { err.textContent = 'Phone number is required.'; return; }
    const digits = ph.replace(/\D/g,'');
    if (digits.length !== 11 && digits.length !== 13) {
      err.textContent = 'Phone must be 11 digits (09XXXXXXXXX) or 13 digits (+63XXXXXXXXXX).'; return;
    }
    err.textContent = '';
    renderOrderSummary();
    setupQRPayment();
    goToStep(2);
  });

  // Step 2 → 1
  document.getElementById('coBack2').addEventListener('click', () => goToStep(1));

  // Place order
  document.getElementById('coPlaceOrder').addEventListener('click', async () => {
    const cart   = getCart();
    const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'cod';
    const user   = auth.currentUser;
    const total  = cart.reduce((s, i) => s + i.price * i.qty, 0);

    // For digital payments, require confirmation
    if ((method === 'gcash' || method === 'maya') && !paymentConfirmed) {
      alert('Please complete the payment simulation first.');
      return;
    }

    const order = {
      items: cart, total,
      paymentMethod: method,
      paymentRef: currentPayRef || null,
      paymentStatus: method === 'cod' ? 'pending' : 'paid_simulated',
      address: {
        firstName: document.getElementById('coFirstName').value.trim(),
        lastName:  document.getElementById('coLastName').value.trim(),
        phone:     document.getElementById('coPhone').value.trim(),
        street:    document.getElementById('coStreet').value.trim(),
        city:      document.getElementById('coCity').value.trim(),
        province:  document.getElementById('coProvince').value.trim(),
        zip:       document.getElementById('coZip').value.trim(),
      },
      userId:    user?.uid   || 'guest',
      email:     user?.email || 'guest',
      status:    'pending',
      createdAt: serverTimestamp(),
    };

    const btn = document.getElementById('coPlaceOrder');
    btn.disabled = true; btn.textContent = 'PLACING ORDER…';

    try {
      const ref = await addDoc(collection(db,'orders'), order);
      await clearCart();
      showReceipt(order, ref.id);
      goToStep(3);
    } catch(e) {
      console.error('Order error:',e);
      alert('Failed to place order. Please try again.');
    } finally {
      btn.disabled = false; btn.textContent = 'PLACE ORDER →';
    }
  });

  // Done
  document.getElementById('coDone').addEventListener('click', closeCheckout);
}
