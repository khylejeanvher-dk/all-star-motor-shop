// checkout.js — Multi-step checkout: Address → Payment → Receipt
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db }       from './firebase.js';
import { getCart, clearCart } from './cart.js';

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
      <h2 class="co-title">CONFIRM DELIVERY ADDRESS</h2>
      <div class="co-form">
        <div class="co-row">
          <div class="co-group"><label>FIRST NAME</label><input id="coFirstName" type="text" placeholder="Juan"/></div>
          <div class="co-group"><label>LAST NAME</label><input id="coLastName" type="text" placeholder="Dela Cruz"/></div>
        </div>
        <div class="co-group"><label>PHONE NUMBER</label><input id="coPhone" type="tel" placeholder="+63 917 000 0000"/></div>
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
      <h2 class="co-title">CHOOSE PAYMENT METHOD</h2>
      <p class="co-sub">This is a demo — no real payment will be processed.</p>
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
            <span class="co-pay-icon">📱</span>
            <div><strong>GCash</strong><p>Send to 0917-ALLSTAR (demo)</p></div>
          </div>
        </label>
        <label class="co-pay-option">
          <input type="radio" name="payMethod" value="maya">
          <div class="co-pay-card">
            <span class="co-pay-icon">💳</span>
            <div><strong>Maya</strong><p>Send to 0917-ALLSTAR (demo)</p></div>
          </div>
        </label>
      </div>

      <div class="co-pay-demo" id="gcashDemo" style="display:none">
        <div class="co-demo-box">
          <p class="co-demo-label">GCash Demo</p>
          <p>Send to: <strong>0917-555-1234</strong></p>
          <p>Account Name: <strong>ALL STAR MOTOR SHOP</strong></p>
          <p class="co-demo-note">⚠ This is a demo. No real transaction.</p>
        </div>
      </div>
      <div class="co-pay-demo" id="mayaDemo" style="display:none">
        <div class="co-demo-box">
          <p class="co-demo-label">Maya Demo</p>
          <p>Send to: <strong>0917-555-1234</strong></p>
          <p>Account Name: <strong>ALL STAR MOTOR SHOP</strong></p>
          <p class="co-demo-note">⚠ This is a demo. No real transaction.</p>
        </div>
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
  document.querySelectorAll('.checkout-panel').forEach((p, i) => p.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.csi').forEach(s => {
    s.classList.toggle('active', +s.dataset.step === n);
    s.classList.toggle('done',   +s.dataset.step < n);
  });
}

// ── Pre-fill address from saved account data ─────────────────────
async function prefillAddress() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return;
    const d = snap.data();
    const set = (id, val) => { if (val) { const el = document.getElementById(id); if (el) el.value = val; } };
    set('coPhone',    d.phone);
    set('coStreet',   d.street);
    set('coCity',     d.city);
    set('coProvince', d.province);
    set('coZip',      d.zip);
    // Try to split displayName into first/last
    if (user.displayName) {
      const parts = user.displayName.split(' ');
      set('coFirstName', parts[0] || '');
      set('coLastName',  parts.slice(1).join(' ') || '');
    }
  } catch(e) { console.warn('Address prefill:', e); }
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
    renderOrderSummary();
    await prefillAddress(); // ← load saved address
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
    if (!fn || !ln || !ph || !st || !ci) { err.textContent = 'Please fill in all required fields.'; return; }
    err.textContent = '';
    renderOrderSummary();
    goToStep(2);
  });

  // Step 2 → 1
  document.getElementById('coBack2').addEventListener('click', () => goToStep(1));

  // Payment method toggle
  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('gcashDemo').style.display = radio.value === 'gcash' ? 'block' : 'none';
      document.getElementById('mayaDemo').style.display  = radio.value === 'maya'  ? 'block' : 'none';
    });
  });

  // Place order
  document.getElementById('coPlaceOrder').addEventListener('click', async () => {
    const cart   = getCart();
    const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'cod';
    const user   = auth.currentUser;
    const total  = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const order = {
      items: cart,
      total,
      paymentMethod: method,
      address: {
        firstName: document.getElementById('coFirstName').value.trim(),
        lastName:  document.getElementById('coLastName').value.trim(),
        phone:     document.getElementById('coPhone').value.trim(),
        street:    document.getElementById('coStreet').value.trim(),
        city:      document.getElementById('coCity').value.trim(),
        province:  document.getElementById('coProvince').value.trim(),
        zip:       document.getElementById('coZip').value.trim(),
      },
      userId:    user?.uid    || 'guest',
      email:     user?.email  || 'guest',
      createdAt: serverTimestamp(),
    };

    const btn = document.getElementById('coPlaceOrder');
    btn.disabled    = true;
    btn.textContent = 'PLACING ORDER…';

    try {
      const ref = await addDoc(collection(db, 'orders'), order);
      await clearCart(); // ← clear cart after successful order
      showReceipt(order, ref.id);
      goToStep(3);
    } catch (e) {
      console.error('Order error:', e);
      alert('Failed to place order. Please try again.');
    } finally {
      btn.disabled    = false;
      btn.textContent = 'PLACE ORDER →';
    }
  });

  // Done
  document.getElementById('coDone').addEventListener('click', () => {
    closeCheckout();
  });
}

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

function showReceipt(order, orderId) {
  const methodLabels = { cod: 'Cash on Delivery', gcash: 'GCash', maya: 'Maya' };
  document.getElementById('coReceiptSub').textContent =
    `Your order has been received. We'll contact you at ${order.address.phone} to confirm delivery.`;
  document.getElementById('coReceiptDetails').innerHTML = `
    <div class="co-receipt-row"><span>Order ID</span><span>#${orderId.slice(-8).toUpperCase()}</span></div>
    <div class="co-receipt-row"><span>Payment</span><span>${methodLabels[order.paymentMethod]}</span></div>
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
