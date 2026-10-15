/**
 * PREMIUM SHOPIFY PRODUCT DETAIL JAVASCRIPT
 * Custom Element <variant-selects>, Availability Matrix, Media Gallery, Lightbox Zoom & Mobile Sticky Bar.
 */

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.section;
    this.productUrl = this.dataset.url;
    this.pickerType = this.dataset.pickerType || 'pills';

    const jsonScript = document.getElementById(`ProductVariantsJson-${this.sectionId}`);
    try {
      this.variantsJson = JSON.parse(jsonScript?.textContent || '[]');
    } catch (e) {
      this.variantsJson = [];
    }
  }

  connectedCallback() {
    this.addEventListener('change', this.onVariantChange.bind(this));
    this.updateOptionsAvailability();
  }

  onVariantChange(e) {
    // 1. Update text label of the changed option
    const fieldset = e.target.closest('.variant-picker');
    if (fieldset) {
      const selectedValText = fieldset.querySelector('[data-selected-value]');
      if (selectedValText) selectedValText.textContent = e.target.value;
    }

    // 2. Collect current selected options
    const selectedOptions = this.getSelectedOptions();

    // 3. Find matching variant
    const currentVariant = this.variantsJson.find((variant) => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });

    // 4. Update product details & availability matrix
    this.updateProductDetails(currentVariant);
    this.updateOptionsAvailability();
  }

  getSelectedOptions() {
    const fieldsets = Array.from(this.querySelectorAll('.variant-picker'));
    return fieldsets.map((fieldset) => {
      const checkedRadio = fieldset.querySelector('input[type="radio"]:checked');
      if (checkedRadio) return checkedRadio.value;
      const select = fieldset.querySelector('select');
      if (select) return select.value;
      return null;
    });
  }

  updateOptionsAvailability() {
    // Cross-reference current selections to flag unavailable combinations
    const fieldsets = Array.from(this.querySelectorAll('.variant-picker'));
    if (fieldsets.length <= 1) return;

    const currentSelected = this.getSelectedOptions();

    fieldsets.forEach((fieldset, optIndex) => {
      const radios = fieldset.querySelectorAll('input[type="radio"]');
      radios.forEach((radio) => {
        const testOptions = [...currentSelected];
        testOptions[optIndex] = radio.value;

        const matchingVariant = this.variantsJson.find((v) => {
          return v.options.every((val, idx) => val === testOptions[idx]);
        });

        const label = radio.closest('.variant-picker__option-label');
        if (label) {
          if (!matchingVariant) {
            label.classList.add('is-unavailable');
            label.classList.remove('is-sold-out');
          } else if (!matchingVariant.available) {
            label.classList.add('is-sold-out');
            label.classList.remove('is-unavailable');
          } else {
            label.classList.remove('is-unavailable', 'is-sold-out');
          }
        }
      });
    });
  }

  updateProductDetails(variant) {
    const variantIdInput = document.getElementById(`ProductVariantId-${this.sectionId}`);
    const submitBtn = document.getElementById(`AddToCartBtn-${this.sectionId}`);
    const submitText = document.getElementById(`AddToCartText-${this.sectionId}`);
    const inventoryNotice = document.getElementById(`Inventory-${this.sectionId}`);
    const priceContainer = document.getElementById(`Price-${this.sectionId}`);
    const skuContainer = document.getElementById(`Sku-${this.sectionId}`);
    const stickyBtn = document.getElementById(`StickyAddToCartBtn-${this.sectionId}`);
    const stickyText = document.getElementById(`StickyAddToCartText-${this.sectionId}`);
    const stickyPrice = document.getElementById(`StickyPrice-${this.sectionId}`);

    if (!variant) {
      // Combination does not exist
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Unavailable';
      if (stickyBtn) stickyBtn.disabled = true;
      if (stickyText) stickyText.textContent = 'Unavailable';
      if (inventoryNotice) {
        inventoryNotice.innerHTML = `
          <span class="inventory-status inventory-status--sold-out">
            <span class="inventory-dot"></span> Unavailable
          </span>
        `;
      }
      return;
    }

    // 1. Update form ID
    if (variantIdInput) variantIdInput.value = variant.id;

    // 2. Update URL parameter
    const newUrl = `${this.productUrl}?variant=${variant.id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // 3. Update CTA buttons
    const isAvailable = variant.available;
    const btnLabel = isAvailable ? 'Add to Cart' : 'Sold Out';

    if (submitBtn) submitBtn.disabled = !isAvailable;
    if (submitText) submitText.textContent = btnLabel;
    if (stickyBtn) stickyBtn.disabled = !isAvailable;
    if (stickyText) stickyText.textContent = btnLabel;

    // 4. Update SKU
    if (skuContainer) {
      const skuVal = skuContainer.querySelector('.product-info__sku-val');
      if (skuVal) skuVal.textContent = variant.sku || '';
      skuContainer.style.display = variant.sku ? 'block' : 'none';
    }

    // 5. Update Inventory Notice
    if (inventoryNotice) {
      if (isAvailable) {
        inventoryNotice.innerHTML = `
          <span class="inventory-status inventory-status--in-stock">
            <span class="inventory-dot"></span> In Stock, Ready to Ship
          </span>
        `;
      } else {
        inventoryNotice.innerHTML = `
          <span class="inventory-status inventory-status--sold-out">
            <span class="inventory-dot"></span> Currently Sold Out
          </span>
        `;
      }
    }

    // 6. Update Price
    const formattedPrice = this.formatMoney(variant.price);
    const isSale = variant.compare_at_price && variant.compare_at_price > variant.price;

    if (priceContainer) {
      let discountBadge = '';
      if (isSale) {
        const discountPercent = Math.round(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price);
        discountBadge = `<span class="badge price__badge-sale">-${discountPercent}%</span>`;
      }

      priceContainer.innerHTML = `
        <div class="price price--large ${isSale ? 'price--on-sale' : ''}">
          <div class="price__container">
            ${isSale ? `
              <div class="price__sale">
                <s class="price-item price-item--regular">${this.formatMoney(variant.compare_at_price)}</s>
                <span class="price-item price-item--sale">${formattedPrice}</span>
              </div>
            ` : `
              <div class="price__regular">
                <span class="price-item price-item--regular">${formattedPrice}</span>
              </div>
            `}
          </div>
          ${discountBadge}
        </div>
      `;
    }

    if (stickyPrice) {
      stickyPrice.textContent = formattedPrice;
    }

    // 7. Update Gallery Media
    if (variant.featured_image && variant.featured_image.src) {
      const mainImage = document.getElementById('ProductMainImage');
      if (mainImage) mainImage.src = variant.featured_image.src;

      const zoomImage = document.getElementById(`ZoomModalImage-${this.sectionId}`);
      if (zoomImage) zoomImage.src = variant.featured_image.src;

      // Highlight matching thumbnail
      document.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
        const matches = thumb.dataset.mediaId == variant.featured_media?.id ||
          thumb.dataset.targetSrc.includes(variant.featured_image.src.split('?')[0]);
        thumb.classList.toggle('is-active', matches);
        thumb.setAttribute('aria-selected', matches ? 'true' : 'false');
      });
    }
  }

  formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }
}
customElements.define('variant-selects', VariantSelects);

/* ==========================================================================
   PRODUCT GALLERY, QUANTITY & MOBILE STICKY BAR CONTROLLERS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Gallery Thumbnail Navigation
  document.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const mainImage = document.getElementById('ProductMainImage');
      const targetSrc = thumb.dataset.targetSrc;
      if (mainImage && targetSrc) {
        mainImage.src = targetSrc;
      }

      const zoomImage = document.querySelector('.product-zoom-modal__image');
      if (zoomImage && targetSrc) {
        zoomImage.src = targetSrc;
      }

      document.querySelectorAll('.product-gallery__thumb').forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      thumb.classList.add('is-active');
      thumb.setAttribute('aria-selected', 'true');
    });
  });

  // 2. Lightbox Zoom Modal
  const zoomBtn = document.querySelector('[data-gallery-zoom]');
  const zoomModal = document.querySelector('.product-zoom-modal');
  if (zoomBtn && zoomModal) {
    zoomBtn.addEventListener('click', () => {
      if (typeof zoomModal.showModal === 'function') {
        zoomModal.showModal();
      } else {
        zoomModal.setAttribute('open', '');
      }
    });

    zoomModal.querySelectorAll('[data-zoom-close]').forEach((el) => {
      el.addEventListener('click', () => {
        if (typeof zoomModal.close === 'function') {
          zoomModal.close();
        } else {
          zoomModal.removeAttribute('open');
        }
      });
    });
  }

  // 3. Quantity Controls
  const qtyMinus = document.querySelector('[data-product-qty-minus]');
  const qtyPlus = document.querySelector('[data-product-qty-plus]');
  const qtyInput = document.querySelector('[data-product-qty-input]');

  if (qtyMinus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = Math.max(1, current - 1);
      qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  if (qtyPlus && qtyInput) {
    qtyPlus.addEventListener('click', () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = current + 1;
      qtyInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // 4. Mobile Sticky Add-to-Cart Bar
  const mainAddToCartBtn = document.querySelector('.product-form__submit-btn');
  const stickyBar = document.querySelector('.product-sticky-bar');
  const stickySubmit = document.querySelector('.product-sticky-bar__submit');

  if (mainAddToCartBtn && stickyBar) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      // Show sticky bar only when main CTA button has scrolled out of view above
      if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
        stickyBar.hidden = false;
        stickyBar.classList.add('is-visible');
      } else {
        stickyBar.classList.remove('is-visible');
        setTimeout(() => {
          if (!stickyBar.classList.contains('is-visible')) stickyBar.hidden = true;
        }, 200);
      }
    }, { threshold: 0 });

    observer.observe(mainAddToCartBtn);

    if (stickySubmit) {
      stickySubmit.addEventListener('click', (e) => {
        e.preventDefault();
        mainAddToCartBtn.click();
      });
    }
  }
});
