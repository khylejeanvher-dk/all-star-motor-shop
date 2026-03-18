// partials.js — Injects shared header, footer, modals into every page

export function getLogoHTML() {
  return `
    <a href="index.html" class="logo" aria-label="ALL STAR MOTOR SHOP">
      <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" class="logo-img"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span class="logo-text" style="display:none">ALL STAR</span>
    </a>`;
}

export function getHeaderHTML() {
  return `
  <!-- LOADING SCREEN -->
  <div id="loadingScreen">
    <div class="loading-logo-wrap">
      <div class="loading-ring-outer"></div>
      <div class="loading-ring"></div>
      <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" class="loading-logo-img"
           onerror="this.style.filter='none'">
    </div>
    <div class="loading-name"><em>ALL STAR</em> MOTOR SHOP</div>
    <div class="loading-bar"><div class="loading-bar-fill"></div></div>
  </div>

  <!-- ANNOUNCEMENT BAR -->
  <div class="announcement-bar">
    <span>FREE DELIVERY ON ORDERS OVER ₱50,000 &nbsp;|&nbsp; NEW ARRIVALS: 2025 SPORT & ADVENTURE BIKES NOW IN STOCK &nbsp;|&nbsp; VISIT US IN PASIG CITY &nbsp;|&nbsp; FREE DELIVERY ON ORDERS OVER ₱50,000 &nbsp;|&nbsp; NEW ARRIVALS: 2025 SPORT & ADVENTURE BIKES NOW IN STOCK</span>
  </div>

  <!-- HEADER -->
  <header class="header" id="header">
    <nav class="nav-desktop">
      <ul class="nav-links nav-left">
        <li><a href="index.html">HOME</a></li>

        <li class="has-dropdown">
          <a href="#" class="dropdown-trigger" data-dropdown="parts">PARTS & GEAR <span class="chevron">▾</span></a>
          <div class="dropdown">
            <a href="category.html?tag=all">ALL PARTS & GEAR</a>
            <a href="category.html?tag=wheels">Wheels &amp; Tires</a>
            <a href="category.html?tag=brakes">Brakes</a>
            <a href="category.html?tag=suspension">Suspension</a>
            <a href="category.html?tag=transmission">Drivetrain / Transmission</a>
            <a href="category.html?tag=engine">Engine Parts</a>
            <a href="category.html?tag=exhaust">Exhaust Systems</a>
            <a href="category.html?tag=bodywork">Body &amp; Seat</a>
            <a href="category.html?tag=gear">Helmets &amp; Gear</a>
          </div>
        </li>
        <li><a href="about.html">ABOUT</a></li>
      </ul>

      <a href="index.html" class="logo">
        <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" class="logo-img"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <span class="logo-text" style="display:none">ALL STAR</span>
      </a>

      <ul class="nav-links nav-right">
        <li><a href="contact.html">CONTACT</a></li>
        <li class="nav-icon">
          <a href="#" id="searchToggle" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </a>
        </li>
        <li class="nav-icon">
          <a href="#" id="cartToggle" aria-label="Cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="cart-count">0</span>
          </a>
        </li>
        <li class="nav-icon">
          <a href="#" id="loginToggle" aria-label="Account">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </a>
        </li>
      </ul>
    </nav>

    <!-- MOBILE NAV -->
    <nav class="nav-mobile">
      <button class="hamburger" id="hamburger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <a href="index.html" class="logo">
        <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" class="logo-img"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <span class="logo-text" style="display:none">ALL STAR</span>
      </a>
      <div class="mobile-nav-icons">
        <a href="#" id="mobileSearchToggle" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </a>
        <a href="#" id="mobileLoginToggle" aria-label="Account">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </a>
        <a href="#" id="mobileCartToggle" aria-label="Cart">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </a>
      </div>
    </nav>
  </header>

  <!-- MOBILE MENU -->
  <div class="mobile-menu" id="mobileMenu">
    <button class="mobile-menu-close" id="menuClose">✕</button>
    <ul>
      <li><a href="index.html">HOME</a></li>

      <li class="mobile-has-sub">
        <button class="mobile-sub-toggle">PARTS & GEAR <span>▾</span></button>
        <ul class="mobile-sub">
          <li><a href="category.html?tag=all">ALL PARTS & GEAR</a></li>
          <li><a href="category.html?cat=parts">ENGINE PARTS</a></li>
          <li><a href="category.html?cat=parts">EXHAUST SYSTEMS</a></li>
          <li><a href="category.html?cat=parts">HELMETS & GEAR</a></li>
        </ul>
      </li>
      <li><a href="about.html">ABOUT</a></li>
      <li><a href="contact.html">CONTACT</a></li>
    </ul>
    <div class="mobile-menu-footer">
      <a href="#">Facebook</a>
      <a href="#">Instagram</a>
      <a href="#">YouTube</a>
    </div>
  </div>
  <div class="overlay" id="overlay"></div>

  <!-- SEARCH OVERLAY -->
  <div class="search-overlay" id="searchOverlay">
    <div class="search-box">
      <div class="search-input-wrap">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" id="searchInput" placeholder="Search motorcycles, parts…" autocomplete="off">
        <button id="searchClose">✕</button>
      </div>
      <div id="searchResults">
        <p class="search-hint">Start typing to search…</p>
      </div>
    </div>
  </div>`;
}

export function getFooterHTML() {
  return `
  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-logo">
          <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" style="height:40px;width:auto;filter:brightness(0)invert(1)"
               onerror="this.outerHTML='<span style=\'font-family:var(--font-display);font-size:22px;letter-spacing:0.1em;color:var(--white)\'>ALL STAR MOTOR SHOP</span>'">
        </div>
        <div class="footer-social">
          <a href="#">Facebook</a>
          <a href="#">Instagram</a>
          <a href="#">YouTube</a>
          <a href="#">TikTok</a>
        </div>
      </div>
      <div class="footer-links">
        <a href="index.html">Home</a>
        <a href="about.html">About Us</a>
        <a href="contact.html">Contact</a>
        <a href="category.html?cat=sport-bikes">Motorcycles</a>
        <a href="category.html?cat=parts">Parts & Gear</a>
        <a href="#">Shipping & Delivery</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </div>
      <div class="footer-bottom">
        <p class="footer-pay">Secure Payment &nbsp;|&nbsp; Cash on Delivery &nbsp;|&nbsp; GCash &nbsp;|&nbsp; Maya</p>
        <p class="footer-copy">© 2026, ALL STAR MOTOR SHOP</p>
        <ul class="footer-policy">
          <li><a href="#">Refund Policy</a></li>
          <li><a href="#">Privacy Policy</a></li>
          <li><a href="#">Terms of Service</a></li>
        </ul>
      </div>
    </div>
  </footer>

  <!-- CART DRAWER -->
  <div class="cart-drawer" id="cartDrawer">
    <div class="cart-drawer-header">
      <h3>YOUR CART</h3>
      <button class="cart-close" id="cartClose">✕</button>
    </div>
    <div class="cart-body" id="cartBody">
      <p class="cart-empty">Your cart is empty.</p>
    </div>
    <div class="cart-footer" id="cartFooter" style="display:none;">
      <div class="cart-total">
        <span>TOTAL</span>
        <span id="cartTotal">₱0.00</span>
      </div>
      <button id="cartCheckoutBtn" class="btn btn-dark btn-full">CHECK OUT</button>
      <button class="btn btn-outline btn-full cart-continue">CONTINUE SHOPPING</button>
    </div>
  </div>
  <div class="cart-overlay" id="cartOverlay"></div>

  <!-- AUTH MODAL -->
  <div class="auth-modal" id="authModal">
    <div class="auth-box">
      <button class="auth-close" id="authClose">✕</button>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">LOG IN</button>
        <button class="auth-tab" data-tab="signup">SIGN UP</button>
      </div>
      <div class="auth-form active" id="loginForm">
        <div class="auth-logo">
          <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" style="height:36px;width:auto"
               onerror="this.outerHTML='<span style=\'font-family:var(--font-display);font-size:20px;letter-spacing:0.08em\'>ALL STAR</span>'">
        </div>
        <h2 class="auth-title">Welcome back</h2>
        <p class="auth-sub">Log in to your account to continue.</p>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="loginEmail" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPassword" placeholder="••••••••" />
          <a href="#" class="form-forgot">Forgot password?</a>
        </div>
        <button class="btn btn-dark btn-full auth-submit">LOG IN</button>
        <p class="auth-switch">Don't have an account? <a href="#" data-switch="signup">Sign up</a></p>
        <div class="auth-divider"><span>or continue with</span></div>
        <div class="auth-social">
          <button class="social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          <button class="social-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>
        </div>
      </div>
      <div class="auth-form" id="signupForm">
        <div class="auth-logo">
          <img src="/ALLSTAR.png" alt="ALL STAR MOTOR SHOP" style="height:36px;width:auto"
               onerror="this.outerHTML='<span style=\'font-family:var(--font-display);font-size:20px;letter-spacing:0.08em\'>ALL STAR</span>'">
        </div>
        <h2 class="auth-title">Create account</h2>
        <p class="auth-sub">Join the ALL STAR MOTOR SHOP community.</p>
        <div class="form-row">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" id="signupFirstName" placeholder="Juan" />
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input type="text" id="signupLastName" placeholder="Dela Cruz" />
          </div>
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="signupEmail" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label>Phone Number <span style="font-size:10px;color:#aaa;font-weight:400">(11 or 13 digits)</span></label>
          <input type="tel" id="signupPhone" placeholder="09171234567" maxlength="14" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="signupPassword" placeholder="Min. 8 characters" />
        </div>
        <div class="form-group">
          <label>Confirm Password</label>
          <input type="password" id="signupConfirmPassword" placeholder="Re-enter password" />
        </div>
        <div class="form-check">
          <input type="checkbox" id="agreeTerms" />
          <label for="agreeTerms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
        </div>
        <button class="btn btn-dark btn-full auth-submit">CREATE ACCOUNT</button>
        <p class="auth-switch">Already have an account? <a href="#" data-switch="login">Log in</a></p>
      </div>
    </div>
  </div>
  <div class="auth-overlay" id="authOverlay"></div>`;
}