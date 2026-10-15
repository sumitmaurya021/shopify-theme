/**
 * PREMIUM SHOPIFY PRODUCT DETAIL JAVASCRIPT
 * Custom Element <variant-selects>, Interactive Gallery, Real-Time Variant Switching & Quantity Controls.
 */

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.section;
    this.productUrl = this.dataset.url;
    this.variantsJson = JSON.parse(document.getElementById(`ProductVariantsJson-${this.sectionId}`)?.textContent || '[]');
  }

  connectedCallback() {
    this.addEventListener('change', this.onVariantChange.bind(this));
  }

  onVariantChange(e) {
    // 1. Update text label of the changed option
    const labelGroup = e.target.closest('.variant-picker');
    if (labelGroup) {
      const selectedValText = labelGroup.querySelector('[data-selected-value]');
      if (selectedValText) selectedValText.textContent = e.target.value;
    }

    // 2. Collect all selected option values in order
    const selectedOptions = Array.from(this.querySelectorAll('.variant-picker')).map((picker) => {
      const checkedRadio = picker.querySelector('input[type="radio"]:checked');
      return checkedRadio ? checkedRadio.value : null;
    });

    // 3. Find matching variant
    const currentVariant = this.variantsJson.find((variant) => {
      return variant.options.every((option, index) => option === selectedOptions[index]);
    });

    this.updateProductDetails(currentVariant);
  }

  updateProductDetails(variant) {
    const variantIdInput = document.getElementById(`ProductVariantId-${this.sectionId}`);
    const submitBtn = document.getElementById(`AddToCartBtn-${this.sectionId}`);
    const submitText = document.getElementById(`AddToCartText-${this.sectionId}`);
    const inventoryNotice = document.getElementById(`Inventory-${this.sectionId}`);
    const priceContainer = document.getElementById(`Price-${this.sectionId}`);

    if (!variant) {
      // Variant combination does not exist
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Unavailable';
      if (inventoryNotice) inventoryNotice.innerHTML = `
        <span class="inventory-status inventory-status--sold-out">
          <span class="inventory-dot"></span> Unavailable
        </span>
      `;
      return;
    }

    // Update variant ID in form
    if (variantIdInput) variantIdInput.value = variant.id;

    // Update URL parameter without reload
    const newUrl = `${this.productUrl}?variant=${variant.id}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    // Update Add to Cart Button state
    if (submitBtn && submitText) {
      if (variant.available) {
        submitBtn.disabled = false;
        submitText.textContent = 'Add to Cart';
      } else {
        submitBtn.disabled = true;
        submitText.textContent = 'Sold Out';
      }
    }

    // Update Inventory Notice
    if (inventoryNotice) {
      if (variant.available) {
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

    // Update Main Image if variant has a featured image
    if (variant.featured_image && variant.featured_image.src) {
      const mainImage = document.getElementById('ProductMainImage');
      if (mainImage) mainImage.src = variant.featured_image.src;

      // Also highlight matching thumbnail
      document.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
        const matches = thumb.dataset.mediaId == variant.featured_media?.id || thumb.dataset.targetSrc.includes(variant.featured_image.src.split('?')[0]);
        thumb.classList.toggle('is-active', matches);
      });
    }

    // Update Price display
    if (priceContainer) {
      const formattedPrice = this.formatMoney(variant.price);
      const isSale = variant.compare_at_price && variant.compare_at_price > variant.price;

      let priceHtml = `
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
          ${isSale ? '<span class="badge price__badge-sale">Sale</span>' : ''}
        </div>
      `;
      priceContainer.innerHTML = priceHtml;
    }
  }

  formatMoney(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }
}
customElements.define('variant-selects', VariantSelects);

/* ==========================================================================
   PRODUCT GALLERY & QUANTITY INTERACTIONS
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Gallery Thumbnail Click Switching
  document.querySelectorAll('.product-gallery__thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const mainImage = document.getElementById('ProductMainImage');
      const targetSrc = thumb.dataset.targetSrc;
      if (mainImage && targetSrc) {
        mainImage.src = targetSrc;
      }
      document.querySelectorAll('.product-gallery__thumb').forEach((t) => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });

  // 2. Quantity Selector on Product Page
  const plusBtn = document.querySelector('[data-product-qty-plus]');
  const minusBtn = document.querySelector('[data-product-qty-minus]');
  const qtyInput = document.querySelector('[data-product-qty-input]');

  if (plusBtn && qtyInput) {
    plusBtn.addEventListener('click', () => {
      qtyInput.value = (parseInt(qtyInput.value, 10) || 1) + 1;
    });
  }

  if (minusBtn && qtyInput) {
    minusBtn.addEventListener('click', () => {
      qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1);
    });
  }
});
