/**
 * PREMIUM SHOPIFY CART DRAWER JAVASCRIPT
 * Custom Element <cart-drawer>, Section Rendering API, Universal Ajax Interception & Focus Management.
 */

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.panel = this.querySelector('.cart-drawer__panel');
    this.overlay = this.querySelector('[data-cart-overlay]');
    this.closeBtn = this.querySelector('[data-cart-close]');
    this.isOpen = false;
    this.activeTrigger = null;
    this.queue = Promise.resolve();
    this.debounceTimers = new Map();
  }

  connectedCallback() {
    this.bindEvents();
    this.bindCartInteractions();

    // Global event hooks
    window.addEventListener('cart:open', (e) => this.open(e.detail?.trigger));
    window.addEventListener('cart:close', () => this.close());
    window.addEventListener('cart:refresh', () => this.refreshCart());
  }

  bindEvents() {
    // Header cart trigger integration
    document.querySelectorAll('#CartIconBubble, [data-cart-drawer-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(trigger);
      });
    });

    // Close buttons and overlay
    this.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-overlay]')) {
        this.close();
      }
    });

    // Keyboard support: Escape closes, Tab traps focus
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });
  }

  bindCartInteractions() {
    // 1. Quantity Selector (+ and -)
    this.querySelectorAll('[data-quantity-plus], [data-quantity-minus]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.dataset.cartKey;
        const input = this.querySelector(`input[data-cart-key="${key}"]`);
        if (!input) return;

        let currentQty = parseInt(input.value, 10) || 0;
        const isPlus = btn.hasAttribute('data-quantity-plus');
        const newQty = isPlus ? currentQty + 1 : Math.max(0, currentQty - 1);

        input.value = newQty;
        this.debounceQuantityChange(key, newQty);
      });
    });

    // 2. Quantity Direct Input Change
    this.querySelectorAll('[data-quantity-input]').forEach((input) => {
      input.addEventListener('change', () => {
        const key = input.dataset.cartKey;
        const newQty = Math.max(0, parseInt(input.value, 10) || 0);
        this.debounceQuantityChange(key, newQty);
      });
    });

    // 3. Remove Button
    this.querySelectorAll('[data-cart-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.dataset.cartRemove;
        this.updateItemQuantity(key, 0);
      });
    });

    // 4. Upsell One-Click Add
    this.querySelectorAll('[data-upsell-add]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const variantId = btn.dataset.upsellAdd;
        const spinner = btn.querySelector('.cart-upsell-card__spinner');
        if (spinner) spinner.hidden = false;
        btn.disabled = true;

        this.addItem(variantId, 1);
      });
    });

    // 5. Order Note Auto-Save
    const noteTextarea = this.querySelector('[data-cart-note]');
    if (noteTextarea) {
      noteTextarea.addEventListener('input', () => {
        clearTimeout(this.noteTimer);
        this.noteTimer = setTimeout(() => {
          this.saveCartNote(noteTextarea.value);
        }, 600);
      });
    }

    // 6. Terms and Conditions validation before Checkout
    const checkoutBtn = this.querySelector('#CartDrawerCheckoutBtn');
    const termsCheckbox = this.querySelector('[data-cart-terms]');
    if (checkoutBtn && termsCheckbox) {
      checkoutBtn.addEventListener('click', (e) => {
        if (!termsCheckbox.checked) {
          e.preventDefault();
          alert('Please agree to the terms and conditions before proceeding to checkout.');
          termsCheckbox.focus();
        }
      });
    }
  }

  open(trigger = null) {
    this.isOpen = true;
    this.activeTrigger = trigger || document.querySelector('#CartIconBubble');
    this.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';

    // Focus close button or panel
    setTimeout(() => {
      const close = this.querySelector('[data-cart-close]');
      if (close) close.focus();
      else if (this.panel) this.panel.focus();
    }, 100);
  }

  close() {
    this.isOpen = false;
    this.removeAttribute('data-open');
    document.body.style.overflow = '';

    // Restore focus to trigger
    if (this.activeTrigger && typeof this.activeTrigger.focus === 'function') {
      this.activeTrigger.focus();
    }
  }

  trapFocus(e) {
    const focusable = this.panel.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  debounceQuantityChange(key, quantity) {
    const itemRow = this.querySelector(`[data-cart-item-key="${key}"]`);
    if (itemRow) itemRow.classList.add('is-updating');

    clearTimeout(this.debounceTimers.get(key));
    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.updateItemQuantity(key, quantity);
      }, 350)
    );
  }

  updateItemQuantity(key, quantity) {
    this.queue = this.queue.then(() => {
      const body = JSON.stringify({
        id: key,
        quantity: quantity,
        sections: 'cart-drawer'
      });

      return fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body
      })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update cart');
        return res.json();
      })
      .then((data) => {
        this.handleCartResponse(data);
      })
      .catch((err) => {
        console.error('Cart update error:', err);
        this.refreshCart();
      });
    });
  }

  addItem(variantId, quantity = 1) {
    this.queue = this.queue.then(() => {
      const body = JSON.stringify({
        items: [{ id: variantId, quantity: quantity }],
        sections: 'cart-drawer'
      });

      return fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body
      })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add product to cart');
        return res.json();
      })
      .then((data) => {
        this.handleCartResponse(data);
        this.open();
      })
      .catch((err) => {
        console.error('Cart add error:', err);
      });
    });
  }

  saveCartNote(note) {
    fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ note: note })
    }).catch((err) => console.error('Cart note error:', err));
  }

  refreshCart() {
    fetch('/?sections=cart-drawer')
      .then((res) => res.json())
      .then((data) => {
        if (data['cart-drawer']) {
          this.renderSectionHtml(data['cart-drawer']);
        }
      });
  }

  handleCartResponse(data) {
    // 1. Update Drawer HTML from Section Rendering API
    if (data.sections && data.sections['cart-drawer']) {
      this.renderSectionHtml(data.sections['cart-drawer']);
    } else {
      this.refreshCart();
    }

    // 2. Fetch latest cart count to synchronize header badge
    fetch('/cart.js')
      .then((res) => res.json())
      .then((cart) => {
        this.updateHeaderCartBadge(cart.item_count);
      });
  }

  renderSectionHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const newPanel = doc.querySelector('.cart-drawer__panel');

    if (newPanel && this.panel) {
      this.panel.innerHTML = newPanel.innerHTML;
      this.bindCartInteractions();
    }
  }

  updateHeaderCartBadge(count) {
    const bubble = document.querySelector('#CartIconBubble');
    if (!bubble) return;

    let badge = bubble.querySelector('#CartCount');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.id = 'CartCount';
        badge.className = 'header-cart-badge';
        bubble.appendChild(badge);
      }
      badge.textContent = count;
      badge.classList.remove('header-cart-badge--pop');
      void badge.offsetWidth; // Force reflow
      badge.classList.add('header-cart-badge--pop');
      bubble.setAttribute('aria-label', `Cart, ${count} items`);
    } else {
      if (badge) badge.remove();
      bubble.setAttribute('aria-label', 'Cart, 0 items');
    }
  }
}
customElements.define('cart-drawer', CartDrawer);

/* ==========================================================================
   UNIVERSAL AJAX ADD-TO-CART FORM INTERCEPTION
   Intercepts standard product forms across the theme and feeds into cart drawer.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[action*="/cart/add"]');
    if (!form || form.dataset.skipAjax === 'true') return;

    e.preventDefault();

    const submitBtn = form.querySelector('[type="submit"]');
    let originalText = '';
    if (submitBtn) {
      submitBtn.disabled = true;
      originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin: 0 auto; display: block;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path fill="none" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      `;
    }

    const formData = new FormData(form);
    formData.append('sections', 'cart-drawer');

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errData) => {
          throw new Error(errData.description || 'Could not add product to cart.');
        });
      }
      return res.json();
    })
    .then((data) => {
      const drawer = document.querySelector('cart-drawer');
      if (drawer) {
        drawer.handleCartResponse(data);
        drawer.open();
      }
    })
    .catch((err) => {
      console.error('Ajax Add-to-Cart error:', err);
      alert(err.message || 'There was a problem adding this item to your cart.');
    })
    .finally(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
});

// Shopify Theme Editor Sync
document.addEventListener('shopify:section:load', (e) => {
  if (e.target.classList.contains('shopify-section-cart-drawer')) {
    const drawer = e.target.querySelector('cart-drawer');
    if (drawer) drawer.bindCartInteractions();
  }
});
