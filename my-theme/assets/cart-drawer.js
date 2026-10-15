/**
 * UNIVERSAL SHOPIFY AJAX CART CONTROLLER
 * High-performance cart management for Cart Drawer & Full Cart Page.
 * Section Rendering API, Debounced Quantity Updates, Free Shipping Recalculation,
 * Inline Error Handling, Multi-Variant Upsells, and Screen-Reader Announcements.
 */

class CartDrawer extends HTMLElement {
  constructor() {
    super();
    this.panel = this.querySelector('.cart-drawer__panel');
    this.overlay = this.querySelector('[data-cart-overlay]');
    this.closeBtn = this.querySelector('[data-cart-close]');
    this.errorBanner = this.querySelector('#CartDrawerError');
    this.liveRegion = document.getElementById('CartDrawerLiveRegion');
    this.isOpen = false;
    this.activeTrigger = null;
    this.queue = Promise.resolve();
    this.debounceTimers = new Map();
  }

  connectedCallback() {
    this.bindEvents();
    this.bindCartInteractions();

    // Global custom event hooks
    window.addEventListener('cart:open', (e) => this.open(e.detail?.trigger));
    window.addEventListener('cart:close', () => this.close());
    window.addEventListener('cart:refresh', () => this.refreshCart());
  }

  bindEvents() {
    // 1. Header cart trigger integration
    document.querySelectorAll('#CartIconBubble, [data-cart-drawer-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        // If customer is on the full cart page, allow normal link navigation if desired, or open drawer
        if (window.location.pathname.endsWith('/cart') && !trigger.hasAttribute('data-force-drawer')) {
          return;
        }
        e.preventDefault();
        this.open(trigger);
      });
    });

    // 2. Close buttons and overlay
    this.addEventListener('click', (e) => {
      if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-overlay]')) {
        this.close();
      }
    });

    // 3. Keyboard support: Escape closes, Tab traps focus
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
    // 1. Quantity Selector (+ and -) in Drawer
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

    // 4. Upsell Variant Selection & Add
    this.querySelectorAll('.cart-upsell-card').forEach((card) => {
      const select = card.querySelector('[data-upsell-variant-select]');
      const addBtn = card.querySelector('[data-upsell-add]');
      const priceWrap = card.querySelector('[data-upsell-price-wrap]');

      if (select && addBtn) {
        select.addEventListener('change', () => {
          const selectedOption = select.options[select.selectedIndex];
          addBtn.dataset.upsellAdd = select.value;

          if (priceWrap && selectedOption.dataset.price) {
            priceWrap.innerHTML = `
              ${selectedOption.dataset.comparePrice ? `<s class="cart-upsell-card__compare-price">${selectedOption.dataset.comparePrice}</s>` : ''}
              <span class="cart-upsell-card__current-price">${selectedOption.dataset.price}</span>
            `;
          }
        });
      }

      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const variantId = addBtn.dataset.upsellAdd;
          if (!variantId) return;

          const spinner = addBtn.querySelector('.cart-upsell-card__spinner');
          if (spinner) spinner.hidden = false;
          addBtn.disabled = true;

          this.addItem(variantId, 1);
        });
      }
    });

    // 5. Promo Code Handler
    const applyDiscountBtn = this.querySelector('[data-apply-discount]');
    const discountInput = this.querySelector('[data-discount-input]');
    const hiddenDiscountInput = this.querySelector('#CartDrawerHiddenDiscount');

    if (applyDiscountBtn && discountInput) {
      applyDiscountBtn.addEventListener('click', () => {
        const code = discountInput.value.trim();
        if (code) {
          if (hiddenDiscountInput) hiddenDiscountInput.value = code;
          applyDiscountBtn.textContent = 'Applied';
          applyDiscountBtn.classList.add('btn--applied');
          this.announce(`Promo code ${code} applied for checkout`);
        }
      });
    }

    // 6. Order Note Auto-Save
    const noteTextarea = this.querySelector('[data-cart-note]');
    if (noteTextarea) {
      noteTextarea.addEventListener('input', () => {
        clearTimeout(this.noteTimer);
        this.noteTimer = setTimeout(() => {
          this.saveCartNote(noteTextarea.value);
        }, 600);
      });
    }

    // 7. Terms & Conditions Validation
    const checkoutBtn = this.querySelector('#CartDrawerCheckoutBtn');
    const termsCheckbox = this.querySelector('[data-cart-terms]');
    if (checkoutBtn && termsCheckbox) {
      checkoutBtn.addEventListener('click', (e) => {
        if (!termsCheckbox.checked) {
          e.preventDefault();
          this.showError('Please accept the terms and conditions before proceeding to checkout.');
          termsCheckbox.focus();
        }
      });
    }

    // 8. Error Dismiss
    const errorClose = this.querySelector('[data-error-dismiss]');
    if (errorClose && this.errorBanner) {
      errorClose.addEventListener('click', () => {
        this.errorBanner.style.display = 'none';
        this.errorBanner.hidden = true;
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
      const sectionsToRender = ['cart-drawer'];
      if (document.getElementById('MainCart')) {
        sectionsToRender.push('main-cart');
      }

      const body = JSON.stringify({
        id: key,
        quantity: quantity,
        sections: sectionsToRender.join(',')
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
        if (!res.ok) {
          return res.json().then((errData) => {
            throw new Error(errData.description || errData.message || 'Unable to update cart quantity.');
          });
        }
        return res.json();
      })
      .then((data) => {
        this.handleCartResponse(data);
        this.announce(quantity === 0 ? 'Item removed from your cart' : `Quantity updated to ${quantity}`);
      })
      .catch((err) => {
        console.error('Cart update error:', err);
        this.showError(err.message || 'Could not update item quantity.');
        this.refreshCart();
      });
    });
  }

  addItem(variantId, quantity = 1) {
    this.queue = this.queue.then(() => {
      const sectionsToRender = ['cart-drawer'];
      if (document.getElementById('MainCart')) {
        sectionsToRender.push('main-cart');
      }

      const body = JSON.stringify({
        items: [{ id: variantId, quantity: quantity }],
        sections: sectionsToRender.join(',')
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
        if (!res.ok) {
          return res.json().then((errData) => {
            throw new Error(errData.description || errData.message || 'Unable to add item to cart.');
          });
        }
        return res.json();
      })
      .then((data) => {
        this.handleCartResponse(data);
        this.open();
        this.announce('Product added to your cart');
      })
      .catch((err) => {
        console.error('Cart add error:', err);
        this.showError(err.message || 'Unable to add item to cart.');
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
    const sectionsToFetch = ['cart-drawer'];
    if (document.getElementById('MainCart')) {
      sectionsToFetch.push('main-cart');
    }

    fetch(`/?sections=${sectionsToFetch.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        if (data['cart-drawer']) {
          this.renderSectionHtml(data['cart-drawer']);
        }
        if (data['main-cart']) {
          this.renderCartPageHtml(data['main-cart']);
        }
      });
  }

  handleCartResponse(data) {
    // 1. Render Drawer HTML
    if (data.sections && data.sections['cart-drawer']) {
      this.renderSectionHtml(data.sections['cart-drawer']);
    } else {
      this.refreshCart();
    }

    // 2. Render Cart Page HTML if on /cart
    if (data.sections && data.sections['main-cart']) {
      this.renderCartPageHtml(data.sections['main-cart']);
    }

    // 3. Update Header Cart Badge
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

  renderCartPageHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const newCartPage = doc.getElementById('MainCart');
    const currentCartPage = document.getElementById('MainCart');

    if (newCartPage && currentCartPage) {
      currentCartPage.innerHTML = newCartPage.innerHTML;
      initCartPageListeners();
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

  showError(message) {
    const errorBanner = this.querySelector('#CartDrawerError');
    if (!errorBanner) return;

    const errorText = errorBanner.querySelector('[data-error-text]');
    if (errorText) errorText.textContent = message;

    errorBanner.style.display = 'flex';
    errorBanner.hidden = false;
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      errorBanner.style.display = 'none';
      errorBanner.hidden = true;
    }, 6000);
  }

  announce(message) {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  }
}
customElements.define('cart-drawer', CartDrawer);

/* ==========================================================================
   FULL CART PAGE AJAX LISTENERS (/cart)
   ========================================================================== */
function initCartPageListeners() {
  const mainCart = document.getElementById('MainCart');
  if (!mainCart) return;

  // 1. Quantity Plus & Minus
  mainCart.querySelectorAll('[data-cart-page-plus], [data-cart-page-minus]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.cartKey;
      const input = mainCart.querySelector(`input[data-cart-key="${key}"]`);
      if (!input) return;

      const current = parseInt(input.value, 10) || 0;
      const isPlus = btn.hasAttribute('data-cart-page-plus');
      const newQty = isPlus ? current + 1 : Math.max(0, current - 1);

      input.value = newQty;
      triggerCartPageUpdate(key, newQty);
    });
  });

  // 2. Quantity Input Direct Change
  mainCart.querySelectorAll('[data-cart-page-input]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.cartKey;
      const newQty = Math.max(0, parseInt(input.value, 10) || 0);
      triggerCartPageUpdate(key, newQty);
    });
  });

  // 3. Remove Link
  mainCart.querySelectorAll('[data-cart-page-remove]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.dataset.cartPageRemove;
      triggerCartPageUpdate(key, 0);
    });
  });

  // 4. Order Note Auto-Save on Cart Page
  const pageNote = mainCart.querySelector('[data-cart-page-note]');
  if (pageNote) {
    pageNote.addEventListener('input', () => {
      clearTimeout(window.cartPageNoteTimer);
      window.cartPageNoteTimer = setTimeout(() => {
        fetch('/cart/update.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ note: pageNote.value })
        }).catch(err => console.error('Cart page note error:', err));
      }, 600);
    });
  }

  // 5. Checkout Spinner
  const checkoutBtn = mainCart.querySelector('#CartPageCheckoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const spinner = checkoutBtn.querySelector('.checkout-spinner');
      const text = checkoutBtn.querySelector('.checkout-text');
      if (spinner) spinner.hidden = false;
      if (text) text.style.opacity = '0.5';
    });
  }
}

function triggerCartPageUpdate(key, quantity) {
  const drawer = document.querySelector('cart-drawer');
  if (drawer) {
    drawer.updateItemQuantity(key, quantity);
  } else {
    // Standalone fallback if cart-drawer custom element not in DOM
    fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        id: key,
        quantity: quantity,
        sections: 'main-cart'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.sections && data.sections['main-cart']) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.sections['main-cart'], 'text/html');
        const currentCart = document.getElementById('MainCart');
        const newCart = doc.getElementById('MainCart');
        if (currentCart && newCart) {
          currentCart.innerHTML = newCart.innerHTML;
          initCartPageListeners();
        }
      }
    });
  }
}

/* ==========================================================================
   UNIVERSAL AJAX ADD-TO-CART FORM INTERCEPTION
   Intercepts product forms across PDP, Collection grids, Recommendations & Quick Add.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initCartPageListeners();

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
    const sectionsToFetch = ['cart-drawer'];
    if (document.getElementById('MainCart')) {
      sectionsToFetch.push('main-cart');
    }
    formData.append('sections', sectionsToFetch.join(','));

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    })
    .then((res) => {
      if (!res.ok) {
        return res.json().then((errData) => {
          throw new Error(errData.description || errData.message || 'Could not add product to cart.');
        });
      }
      return res.json();
    })
    .then((data) => {
      const drawer = document.querySelector('cart-drawer');
      if (drawer) {
        drawer.handleCartResponse(data);
        drawer.open();
        drawer.announce('Item added to cart');
      }
    })
    .catch((err) => {
      console.error('Ajax Add-to-Cart error:', err);
      const drawer = document.querySelector('cart-drawer');
      if (drawer) {
        drawer.showError(err.message || 'There was a problem adding this item.');
        drawer.open();
      } else {
        alert(err.message || 'There was a problem adding this item to your cart.');
      }
    })
    .finally(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
});

// Shopify Theme Editor Section Reload Sync
document.addEventListener('shopify:section:load', (e) => {
  if (e.target.classList.contains('shopify-section-cart-drawer')) {
    const drawer = e.target.querySelector('cart-drawer');
    if (drawer) drawer.bindCartInteractions();
  }
  if (e.target.classList.contains('shopify-section-main-cart')) {
    initCartPageListeners();
  }
});
