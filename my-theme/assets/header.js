/**
 * PREMIUM SHOPIFY HEADER JAVASCRIPT
 * Custom Elements, Scroll Intelligence, Predictive Search & Accessibility.
 */

/* ==========================================================================
   1. STICKY HEADER COMPONENT (<sticky-header>)
   ========================================================================== */
class StickyHeader extends HTMLElement {
  constructor() {
    super();
    this.header = this.querySelector('.site-header');
    this.stickyMode = this.dataset.stickyMode || 'none';
    this.isTransparent = this.classList.contains('header--transparent');
    this.currentScrollTop = 0;
    this.lastScrollTop = 0;
    this.scrollThreshold = 100;
    this.ticking = false;
  }

  connectedCallback() {
    this.updateHeaderHeight();
    window.addEventListener('resize', this.onResize.bind(this), { passive: true });

    if (this.stickyMode !== 'none' || this.isTransparent) {
      window.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    }
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('scroll', this.onScroll.bind(this));
  }

  updateHeaderHeight() {
    const height = this.offsetHeight;
    document.documentElement.style.setProperty('--header-actual-height', `${height}px`);
  }

  onResize() {
    this.updateHeaderHeight();
  }

  onScroll() {
    if (!this.ticking) {
      window.requestAnimationFrame(() => {
        this.handleScroll();
        this.ticking = false;
      });
      this.ticking = true;
    }
  }

  handleScroll() {
    this.currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // 1. Transparent Header Scrolled State
    if (this.isTransparent) {
      if (this.currentScrollTop > 40) {
        this.classList.add('header--scrolled');
      } else {
        this.classList.remove('header--scrolled');
      }
    }

    // 2. Shrink / Compact Header Mode
    if (this.stickyMode === 'shrink') {
      if (this.currentScrollTop > 80) {
        this.classList.add('header--scrolled');
      } else {
        this.classList.remove('header--scrolled');
      }
    }

    // 3. Smart Sticky Scroll-Up Mode
    if (this.stickyMode === 'on-scroll-up') {
      if (this.currentScrollTop > this.scrollThreshold) {
        if (this.currentScrollTop > this.lastScrollTop && this.currentScrollTop > 150) {
          // Scrolling Down -> Hide Header
          this.classList.add('header--hidden');
          this.classList.remove('header--visible');
          this.closeAllDropdowns();
        } else {
          // Scrolling Up -> Reveal Header
          this.classList.remove('header--hidden');
          this.classList.add('header--visible');
        }
      } else {
        // Near top of page
        this.classList.remove('header--hidden');
        this.classList.remove('header--visible');
      }
    }

    this.lastScrollTop = Math.max(0, this.currentScrollTop);
  }

  closeAllDropdowns() {
    this.querySelectorAll('details[open]').forEach((details) => {
      details.removeAttribute('open');
      const summary = details.querySelector('summary');
      if (summary) summary.setAttribute('aria-expanded', 'false');
    });
  }
}
customElements.define('sticky-header', StickyHeader);

/* ==========================================================================
   2. DESKTOP NAVIGATION HOVER & DISCLOSURE
   ========================================================================== */
class DesktopNavigation {
  constructor() {
    this.init();
  }

  init() {
    const navItems = document.querySelectorAll('.nav-item--has-dropdown, .nav-item--has-mega');
    navItems.forEach((item) => {
      const details = item.querySelector('details');
      if (!details) return;

      let leaveTimeout;

      // Pointer enter: open details
      item.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimeout);
        // Close other open siblings
        document.querySelectorAll('.disclosure-menu[open]').forEach((other) => {
          if (other !== details) {
            other.removeAttribute('open');
            const otherSum = other.querySelector('summary');
            if (otherSum) otherSum.setAttribute('aria-expanded', 'false');
          }
        });
        details.setAttribute('open', '');
        const summary = details.querySelector('summary');
        if (summary) summary.setAttribute('aria-expanded', 'true');
      });

      // Pointer leave: delayed close (prevents diagonal mouse-drop)
      item.addEventListener('mouseleave', () => {
        leaveTimeout = setTimeout(() => {
          details.removeAttribute('open');
          const summary = details.querySelector('summary');
          if (summary) summary.setAttribute('aria-expanded', 'false');
        }, 150);
      });
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-nav')) {
        document.querySelectorAll('.disclosure-menu[open]').forEach((details) => {
          details.removeAttribute('open');
          const summary = details.querySelector('summary');
          if (summary) summary.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openDetails = document.querySelector('.disclosure-menu[open]');
        if (openDetails) {
          openDetails.removeAttribute('open');
          const summary = openDetails.querySelector('summary');
          if (summary) {
            summary.setAttribute('aria-expanded', 'false');
            summary.focus();
          }
        }
      }
    });
  }
}

/* ==========================================================================
   3. MOBILE DRAWER COMPONENT (<header-drawer>)
   ========================================================================== */
class HeaderDrawer extends HTMLElement {
  constructor() {
    super();
    this.openBtn = this.querySelector('[data-drawer-open]');
    this.closeBtn = this.querySelector('[data-drawer-close]');
    this.overlay = this.querySelector('[data-drawer-overlay]');
    this.panel = this.querySelector('.header-drawer__panel');
    this.isOpen = false;
  }

  connectedCallback() {
    if (this.openBtn) this.openBtn.addEventListener('click', this.toggleDrawer.bind(this));
    if (this.closeBtn) this.closeBtn.addEventListener('click', this.closeDrawer.bind(this));
    if (this.overlay) this.overlay.addEventListener('click', this.closeDrawer.bind(this));

    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeDrawer();
      }
    });
  }

  toggleDrawer() {
    if (this.isOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer() {
    this.isOpen = true;
    this.setAttribute('data-open', 'true');
    if (this.openBtn) {
      this.openBtn.setAttribute('aria-expanded', 'true');
      this.openBtn.setAttribute('aria-label', 'Close menu');
    }
    document.body.style.overflow = 'hidden';
    if (this.panel) this.panel.focus();
  }

  closeDrawer() {
    this.isOpen = false;
    this.setAttribute('data-open', 'false');
    if (this.openBtn) {
      this.openBtn.setAttribute('aria-expanded', 'false');
      this.openBtn.setAttribute('aria-label', 'Open menu');
      this.openBtn.focus();
    }
    document.body.style.overflow = '';
  }
}
customElements.define('header-drawer', HeaderDrawer);

/* ==========================================================================
   4. PREDICTIVE SEARCH COMPONENT (<predictive-search>)
   ========================================================================== */
class PredictiveSearch extends HTMLElement {
  constructor() {
    super();
    this.modal = this;
    this.input = this.querySelector('[data-search-input]');
    this.clearBtn = this.querySelector('[data-search-clear]');
    this.closeBtn = this.querySelector('[data-search-close]');
    this.overlay = this.querySelector('[data-search-overlay]');
    this.spinner = this.querySelector('[data-search-spinner]');
    this.resultsContainer = this.querySelector('[data-search-content]');
    this.defaultState = this.querySelector('[data-search-default]');
    this.debounceTimer = null;
    this.abortController = null;
  }

  connectedCallback() {
    // Connect to external search trigger icons
    document.querySelectorAll('[data-search-trigger]').forEach((btn) => {
      btn.addEventListener('click', this.openModal.bind(this));
    });

    if (this.closeBtn) this.closeBtn.addEventListener('click', this.closeModal.bind(this));
    if (this.overlay) this.overlay.addEventListener('click', this.closeModal.bind(this));

    if (this.input) {
      this.input.addEventListener('input', this.onInput.bind(this));
      this.input.addEventListener('keydown', this.onKeydown.bind(this));
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.input.value = '';
        this.resetResults();
        this.input.focus();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.getAttribute('data-open') === 'true') {
        this.closeModal();
      }
    });
  }

  openModal() {
    this.modal.setAttribute('data-open', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (this.input) this.input.focus();
    }, 100);
  }

  closeModal() {
    this.modal.removeAttribute('data-open');
    document.body.style.overflow = '';
    const trigger = document.querySelector('[data-search-trigger]');
    if (trigger) trigger.focus();
  }

  onInput() {
    const query = this.input.value.trim();

    if (this.clearBtn) {
      this.clearBtn.hidden = query.length === 0;
    }

    if (query.length < 2) {
      this.resetResults();
      return;
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 280);
  }

  onKeydown(e) {
    if (e.key === 'ArrowDown') {
      const firstLink = this.resultsContainer.querySelector('a');
      if (firstLink) {
        e.preventDefault();
        firstLink.focus();
      }
    }
  }

  resetResults() {
    if (this.resultsContainer) {
      this.resultsContainer.innerHTML = '';
      this.resultsContainer.hidden = true;
    }
    if (this.defaultState) this.defaultState.hidden = false;
    if (this.spinner) this.spinner.hidden = true;
  }

  fetchSuggestions(query) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    if (this.spinner) this.spinner.hidden = false;

    const endpoint = `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[options][fields]=title,product_type,variants.title,vendor`;

    fetch(endpoint, { signal: this.abortController.signal })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        if (this.spinner) this.spinner.hidden = true;
        this.renderResults(data, query);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          if (this.spinner) this.spinner.hidden = true;
          console.error('Predictive search error:', err);
        }
      });
  }

  renderResults(data, query) {
    const products = data.resources?.results?.products || [];

    if (this.defaultState) this.defaultState.hidden = true;
    if (!this.resultsContainer) return;

    if (products.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="predictive-search__empty">
          <p class="predictive-search__hint">No products found for "<strong>${this.escapeHtml(query)}</strong>"</p>
        </div>
      `;
      this.resultsContainer.hidden = false;
      return;
    }

    let html = `
      <div class="predictive-results-grid">
        ${products.map((product) => `
          <a href="${product.url}" class="predictive-card">
            <div class="predictive-card__media">
              ${product.image ? `<img src="${product.image}" alt="${this.escapeHtml(product.title)}" class="predictive-card__image" loading="lazy" width="200" height="200">` : ''}
            </div>
            <div class="predictive-card__info">
              ${product.vendor ? `<span class="predictive-card__vendor">${this.escapeHtml(product.vendor)}</span>` : ''}
              <h5 class="predictive-card__title">${this.escapeHtml(product.title)}</h5>
              <span class="predictive-card__price">${product.price || ''}</span>
            </div>
          </a>
        `).join('')}
      </div>
      <div class="predictive-view-all">
        <a href="/search?q=${encodeURIComponent(query)}&options%5Bprefix%5D=last" class="predictive-view-all__btn">
          View all results for "${this.escapeHtml(query)}"
        </a>
      </div>
    `;

    this.resultsContainer.innerHTML = html;
    this.resultsContainer.hidden = false;
  }

  escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}
customElements.define('predictive-search', PredictiveSearch);

/* ==========================================================================
   5. ANNOUNCEMENT BAR ROTATOR (<announcement-bar>)
   ========================================================================== */
class AnnouncementBar extends HTMLElement {
  constructor() {
    super();
    this.items = this.querySelectorAll('.announcement-bar__item');
    this.prevBtn = this.querySelector('[data-announcement-prev]');
    this.nextBtn = this.querySelector('[data-announcement-next]');
    this.closeBtn = this.querySelector('[data-announcement-close]');
    this.currentIndex = 0;
    this.autoRotate = this.dataset.autoRotate === 'true';
    this.intervalTime = parseInt(this.dataset.interval, 10) * 1000 || 4500;
    this.timer = null;
  }

  connectedCallback() {
    if (sessionStorage.getItem('theme-announcement-dismissed') === 'true') {
      this.hidden = true;
      return;
    }

    if (this.items.length > 1) {
      if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.showPrev());
      if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.showNext());

      if (this.autoRotate) {
        this.startAutoRotate();
        this.addEventListener('mouseenter', () => this.stopAutoRotate());
        this.addEventListener('mouseleave', () => this.startAutoRotate());
        this.addEventListener('focusin', () => this.stopAutoRotate());
        this.addEventListener('focusout', () => this.startAutoRotate());
      }
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.hidden = true;
        sessionStorage.setItem('theme-announcement-dismissed', 'true');
      });
    }
  }

  showIndex(index) {
    this.items.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
    });
    this.currentIndex = index;
  }

  showNext() {
    const nextIndex = (this.currentIndex + 1) % this.items.length;
    this.showIndex(nextIndex);
  }

  showPrev() {
    const prevIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
    this.showIndex(prevIndex);
  }

  startAutoRotate() {
    this.stopAutoRotate();
    this.timer = setInterval(() => {
      this.showNext();
    }, this.intervalTime);
  }

  stopAutoRotate() {
    if (this.timer) clearInterval(this.timer);
  }
}
customElements.define('announcement-bar', AnnouncementBar);

/* ==========================================================================
   6. GLOBAL INITIALIZATION & THEME EDITOR SYNC
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  new DesktopNavigation();
});

// Support Shopify Theme Editor live updates
document.addEventListener('shopify:section:load', (e) => {
  if (e.target.classList.contains('header-section')) {
    new DesktopNavigation();
    const stickyHeader = e.target.querySelector('sticky-header');
    if (stickyHeader) stickyHeader.updateHeaderHeight();
  }
});
