/**
 * PREMIUM QUICK ADD CONTROLLER
 * Handles inline variant selection, availability matching, price updates, and cart drawer handoff.
 */

(function () {
  'use strict';

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  function initQuickAdd() {
    // 1. Toggle Quick Select Drawer
    document.addEventListener('click', function (e) {
      const trigger = e.target.closest('[data-trigger-quick-select]');
      if (trigger) {
        e.preventDefault();
        const productId = trigger.dataset.triggerQuickSelect;
        const panel = document.getElementById(`QuickSelect-${productId}`);
        if (!panel) return;

        // Close any other open quick-select panels
        document.querySelectorAll('.product-card__quick-select:not([hidden])').forEach(function (openPanel) {
          if (openPanel !== panel) {
            openPanel.hidden = true;
            const openTrigger = openPanel.closest('.product-card')?.querySelector('[data-trigger-quick-select]');
            if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
          }
        });

        const isHidden = panel.hidden;
        panel.hidden = !isHidden;
        trigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        return;
      }

      // Close button
      const closeBtn = e.target.closest('[data-close-quick-select]');
      if (closeBtn) {
        e.preventDefault();
        const panel = closeBtn.closest('.product-card__quick-select');
        if (panel) {
          panel.hidden = true;
          const card = panel.closest('.product-card');
          const triggerBtn = card?.querySelector('[data-trigger-quick-select]');
          if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      // Click outside to close
      if (!e.target.closest('.product-card')) {
        document.querySelectorAll('.product-card__quick-select:not([hidden])').forEach(function (panel) {
          panel.hidden = true;
          const triggerBtn = panel.closest('.product-card')?.querySelector('[data-trigger-quick-select]');
          if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
        });
      }
    });

    // 2. Variant Option Selection & Availability Resolution
    document.addEventListener('change', function (e) {
      const radio = e.target.closest('.quick-select__radio');
      if (!radio) return;

      const form = radio.closest('[data-quick-select-form]');
      if (!form) return;

      // Update option label text
      const group = radio.closest('.quick-select__option-group');
      if (group) {
        const valText = group.querySelector('[data-quick-option-value]');
        if (valText) valText.textContent = radio.value;
      }

      // Collect all selected values
      const optionGroups = Array.from(form.querySelectorAll('.quick-select__option-group'));
      const selectedOptions = optionGroups.map(function (grp) {
        const checked = grp.querySelector('input[type="radio"]:checked');
        return checked ? checked.value : null;
      });

      // Parse variants JSON
      const jsonScript = form.querySelector('.product-card__variants-json');
      if (!jsonScript) return;

      let variants = [];
      try {
        variants = JSON.parse(jsonScript.textContent);
      } catch (err) {
        console.error('Failed to parse variants JSON in quick-add:', err);
        return;
      }

      // Find matching variant
      const matchingVariant = variants.find(function (v) {
        return v.options.every(function (optVal, idx) {
          return optVal === selectedOptions[idx];
        });
      });

      const variantIdInput = form.querySelector('[data-quick-variant-id]');
      const submitBtn = form.querySelector('[data-quick-submit]');
      const submitText = form.querySelector('[data-quick-submit-text]');

      if (!matchingVariant) {
        if (submitBtn) submitBtn.disabled = true;
        if (submitText) submitText.textContent = 'Unavailable';
        return;
      }

      if (variantIdInput) variantIdInput.value = matchingVariant.id;

      if (submitBtn && submitText) {
        if (matchingVariant.available) {
          submitBtn.disabled = false;
          submitText.textContent = `Add to Cart • ${formatMoney(matchingVariant.price)}`;
        } else {
          submitBtn.disabled = true;
          submitText.textContent = 'Sold Out';
        }
      }
    });

    // 3. Auto-close Quick Select Panel after submission
    document.addEventListener('submit', function (e) {
      const form = e.target.closest('[data-quick-select-form]');
      if (!form) return;

      const panel = form.closest('.product-card__quick-select');
      if (panel) {
        setTimeout(function () {
          panel.hidden = true;
          const triggerBtn = panel.closest('.product-card')?.querySelector('[data-trigger-quick-select]');
          if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');
        }, 300);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickAdd);
  } else {
    initQuickAdd();
  }
})();
