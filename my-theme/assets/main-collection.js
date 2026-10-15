/**
 * PREMIUM SHOPIFY COLLECTION JAVASCRIPT
 * Ajax Filtering, Live Sorting, Browser History Synchronization, Filter Drawer & Ajax "Load More".
 */

(function () {
  'use strict';

  class CollectionController {
    constructor() {
      this.gridContainer = document.getElementById('CollectionProductGrid');
      if (!this.gridContainer) return;

      this.filterDrawer = document.getElementById('CollectionFilterDrawer');
      this.loader = document.getElementById('ProductGridLoader');
      this.activeRequestId = 0;

      this.initEventListeners();
    }

    initEventListeners() {
      // 1. Mobile Filter Drawer Open/Close
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-filter-drawer-open]')) {
          e.preventDefault();
          this.openFilterDrawer();
          return;
        }

        if (e.target.closest('[data-filter-drawer-close]')) {
          e.preventDefault();
          this.closeFilterDrawer();
          return;
        }

        // Active Chip click (instant Ajax removal)
        const chip = e.target.closest('[data-filter-chip]');
        if (chip) {
          e.preventDefault();
          this.fetchAndUpdate(chip.href);
          return;
        }

        // Clear all filters click
        const clearAll = e.target.closest('[data-filter-clear-all]');
        if (clearAll) {
          e.preventDefault();
          this.fetchAndUpdate(clearAll.href);
          return;
        }

        // Load More button click
        const loadMoreBtn = e.target.closest('[data-load-more-btn]');
        if (loadMoreBtn) {
          e.preventDefault();
          this.handleLoadMore(loadMoreBtn);
          return;
        }
      });

      // Escape key closes filter drawer
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.filterDrawer && this.filterDrawer.classList.contains('is-open')) {
          this.closeFilterDrawer();
        }
      });

      // 2. Filter Checkbox Changes
      document.addEventListener('change', (e) => {
        if (e.target.closest('.collection-filter-checkbox')) {
          const form = document.getElementById('CollectionFiltersForm');
          if (form) this.submitFilterForm(form);
          return;
        }

        // 3. Sorting Dropdown Change
        if (e.target.closest('[data-collection-sort]')) {
          const sortBy = e.target.value;
          this.handleSortChange(sortBy);
          return;
        }
      });

      // Price Range form submit
      document.addEventListener('submit', (e) => {
        if (e.target.closest('[data-collection-filter-form]')) {
          e.preventDefault();
          this.submitFilterForm(e.target);
        }
      });

      // 4. Browser History (Back / Forward navigation)
      window.addEventListener('popstate', () => {
        this.fetchAndUpdate(window.location.href, false);
      });
    }

    openFilterDrawer() {
      if (!this.filterDrawer) return;
      this.filterDrawer.classList.add('is-open');
      this.filterDrawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      const openBtn = document.querySelector('[data-filter-drawer-open]');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
    }

    closeFilterDrawer() {
      if (!this.filterDrawer) return;
      this.filterDrawer.classList.remove('is-open');
      this.filterDrawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      const openBtn = document.querySelector('[data-filter-drawer-open]');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
    }

    submitFilterForm(form) {
      const formData = new FormData(form);
      const params = new URLSearchParams();

      for (const [key, value] of formData.entries()) {
        if (value.trim() !== '') {
          params.append(key, value);
        }
      }

      const sortSelect = document.getElementById('SortBy');
      if (sortSelect && !params.has('sort_by') && sortSelect.value) {
        params.set('sort_by', sortSelect.value);
      }

      const searchUrl = `${window.location.pathname}?${params.toString()}`;
      this.fetchAndUpdate(searchUrl);
    }

    handleSortChange(sortBy) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('sort_by', sortBy);
      this.fetchAndUpdate(currentUrl.toString());
    }

    fetchAndUpdate(url, updateHistory = true) {
      const requestId = ++this.activeRequestId;
      this.showLoader(true);

      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error('Network error');
          return response.text();
        })
        .then((htmlText) => {
          if (requestId !== this.activeRequestId) return; // Ignore stale responses

          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');

          // 1. Update Product Grid
          const newGrid = doc.getElementById('ProductGridContainer');
          const currentGrid = document.getElementById('ProductGridContainer');
          const gridWrapper = document.getElementById('ProductGridWrapper');
          const newWrapper = doc.getElementById('ProductGridWrapper');

          if (gridWrapper && newWrapper) {
            gridWrapper.innerHTML = newWrapper.innerHTML;
          } else if (currentGrid && newGrid) {
            currentGrid.innerHTML = newGrid.innerHTML;
          }

          // 2. Update Product Count
          const newCount = doc.getElementById('CollectionProductCount');
          const currentCount = document.getElementById('CollectionProductCount');
          if (currentCount && newCount) {
            currentCount.innerHTML = newCount.innerHTML;
          }

          // 3. Update Active Filters
          const newActiveFilters = doc.getElementById('ActiveFiltersContainer');
          const currentActiveFilters = document.getElementById('ActiveFiltersContainer');
          if (currentActiveFilters && newActiveFilters) {
            currentActiveFilters.innerHTML = newActiveFilters.innerHTML;
          }

          // 4. Update Filter Form & Facet Counts
          const newFiltersForm = doc.getElementById('CollectionFiltersForm');
          const currentFiltersForm = document.getElementById('CollectionFiltersForm');
          if (currentFiltersForm && newFiltersForm) {
            currentFiltersForm.innerHTML = newFiltersForm.innerHTML;
          }

          // 5. Update Pagination / Load More
          const newPagination = doc.getElementById('CollectionPaginationContainer');
          const currentPagination = document.getElementById('CollectionPaginationContainer');
          if (currentPagination && newPagination) {
            currentPagination.innerHTML = newPagination.innerHTML;
          }

          // 6. Update Sort dropdown value
          const newSort = doc.getElementById('SortBy');
          const currentSort = document.getElementById('SortBy');
          if (currentSort && newSort) {
            currentSort.value = newSort.value;
          }

          // 7. Update URL in browser
          if (updateHistory) {
            window.history.pushState({ path: url }, '', url);
          }

          this.showLoader(false);
        })
        .catch((err) => {
          console.error('Ajax collection update error:', err);
          this.showLoader(false);
        });
    }

    handleLoadMore(btn) {
      const nextUrl = btn.dataset.loadMoreUrl;
      if (!nextUrl || btn.disabled) return;

      const spinner = btn.querySelector('.load-more-spinner');
      const text = btn.querySelector('.load-more-text');

      btn.disabled = true;
      if (spinner) spinner.hidden = false;
      if (text) text.style.opacity = '0.4';

      fetch(nextUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Failed to load next page');
          return res.text();
        })
        .then((htmlText) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, 'text/html');

          // Append new product items to existing container
          const newItems = doc.querySelectorAll('#ProductGridContainer [data-product-grid-item]');
          const currentGrid = document.getElementById('ProductGridContainer');

          if (currentGrid && newItems.length > 0) {
            newItems.forEach((item) => currentGrid.appendChild(item));
          }

          // Update Pagination container (next button or final state)
          const newPagination = doc.getElementById('CollectionPaginationContainer');
          const currentPagination = document.getElementById('CollectionPaginationContainer');
          if (currentPagination && newPagination) {
            currentPagination.innerHTML = newPagination.innerHTML;
          }
        })
        .catch((err) => {
          console.error('Load more error:', err);
          btn.disabled = false;
          if (spinner) spinner.hidden = true;
          if (text) text.style.opacity = '1';
        });
    }

    showLoader(show) {
      const loader = document.getElementById('ProductGridLoader');
      const grid = document.getElementById('ProductGridContainer');
      if (loader) loader.hidden = !show;
      if (grid) grid.style.opacity = show ? '0.35' : '1';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new CollectionController());
  } else {
    new CollectionController();
  }
})();
