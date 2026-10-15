/**
 * UNIVERSAL SHOPIFY SECTION LIBRARY JS
 * High-performance, modular, zero-dependency, and accessible component controller.
 * Supports native Shopify Theme Editor events for instant live customization.
 */

(function () {
  'use strict';

  function initAccordions(container) {
    const accordions = (container || document).querySelectorAll('[data-accordion]');
    accordions.forEach((group) => {
      const items = group.querySelectorAll('.accordion-item');
      items.forEach((item) => {
        const trigger = item.querySelector('.accordion-trigger');
        const content = item.querySelector('.accordion-content');
        if (!trigger || !content || trigger._accordionInit) return;
        trigger._accordionInit = true;

        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          const isOpen = item.classList.contains('is-open') || item.hasAttribute('open');

          // If single-collapse mode is requested
          if (group.dataset.accordion === 'single') {
            items.forEach((other) => {
              if (other !== item) {
                other.classList.remove('is-open');
                other.removeAttribute('open');
                const otherTrigger = other.querySelector('.accordion-trigger');
                if (otherTrigger) otherTrigger.setAttribute('aria-expanded', 'false');
              }
            });
          }

          if (isOpen) {
            item.classList.remove('is-open');
            item.removeAttribute('open');
            trigger.setAttribute('aria-expanded', 'false');
          } else {
            item.classList.add('is-open');
            item.setAttribute('open', '');
            trigger.setAttribute('aria-expanded', 'true');
          }
        });
      });
    });
  }

  function initTabs(container) {
    const tabGroups = (container || document).querySelectorAll('[data-tabs]');
    tabGroups.forEach((tabs) => {
      const btns = tabs.querySelectorAll('.tabs-btn');
      const panels = tabs.querySelectorAll('.tab-panel');
      if (tabs._tabsInit) return;
      tabs._tabsInit = true;

      btns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
          btns.forEach((b) => {
            b.classList.remove('is-active');
            b.setAttribute('aria-selected', 'false');
          });
          panels.forEach((p) => {
            p.classList.remove('is-active');
            p.setAttribute('aria-hidden', 'true');
          });

          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
          if (panels[index]) {
            panels[index].classList.add('is-active');
            panels[index].setAttribute('aria-hidden', 'false');
          }
        });
      });
    });
  }

  function initSliders(container) {
    const sliders = (container || document).querySelectorAll('[data-section-slider]');
    sliders.forEach((slider) => {
      const track = slider.querySelector('.section-slider__track');
      const prevBtn = slider.querySelector('[data-slider-prev]');
      const nextBtn = slider.querySelector('[data-slider-next]');
      if (!track || slider._sliderInit) return;
      slider._sliderInit = true;

      const updateArrows = () => {
        if (!prevBtn && !nextBtn) return;
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (prevBtn) prevBtn.disabled = track.scrollLeft <= 5;
        if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll - 5;
      };

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          const scrollAmount = track.clientWidth * 0.8;
          track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          const scrollAmount = track.clientWidth * 0.8;
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });
      }

      track.addEventListener('scroll', updateArrows, { passive: true });
      window.addEventListener('resize', updateArrows, { passive: true });
      updateArrows();
    });
  }

  function initBeforeAfter(container) {
    const components = (container || document).querySelectorAll('[data-before-after]');
    components.forEach((comp) => {
      if (comp._baInit) return;
      comp._baInit = true;

      let isDragging = false;
      const setPosition = (clientX) => {
        const rect = comp.getBoundingClientRect();
        let pos = ((clientX - rect.left) / rect.width) * 100;
        pos = Math.max(0, Math.min(100, pos));
        comp.style.setProperty('--clip-pos', `${pos}%`);
      };

      const onStart = (e) => {
        isDragging = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setPosition(clientX);
      };

      const onMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        setPosition(clientX);
      };

      const onEnd = () => {
        isDragging = false;
      };

      comp.addEventListener('mousedown', onStart);
      comp.addEventListener('touchstart', onStart, { passive: true });

      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: true });

      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
    });
  }

  function initCopyButtons(container) {
    const copyBtns = (container || document).querySelectorAll('[data-copy-code]');
    copyBtns.forEach((btn) => {
      if (btn._copyInit) return;
      btn._copyInit = true;

      btn.addEventListener('click', () => {
        const code = btn.dataset.copyCode;
        if (!code) return;
        navigator.clipboard.writeText(code).then(() => {
          const originalText = btn.innerHTML;
          btn.innerHTML = '<span>Copied! &#10003;</span>';
          btn.classList.add('is-copied');
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('is-copied');
          }, 2000);
        });
      });
    });
  }

  function initSlideshows(container) {
    const slideshows = (container || document).querySelectorAll('[data-slideshow]');
    slideshows.forEach((show) => {
      if (show._slideshowInit) return;
      show._slideshowInit = true;

      const slides = show.querySelectorAll('.slideshow__slide');
      const dots = show.querySelectorAll('.slideshow__dot');
      const prevBtn = show.querySelector('[data-slide-prev]');
      const nextBtn = show.querySelector('[data-slide-next]');
      const isAutoplay = show.dataset.autoplay === 'true';
      const speed = parseInt(show.dataset.speed, 10) || 5000;
      let currentIndex = 0;
      let timer = null;

      function goToSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        currentIndex = index;

        slides.forEach((slide, i) => {
          slide.classList.toggle('is-active', i === currentIndex);
          slide.setAttribute('aria-hidden', i === currentIndex ? 'false' : 'true');
        });

        dots.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === currentIndex);
          dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
        });
      }

      function startAutoplay() {
        if (!isAutoplay || slides.length <= 1) return;
        stopAutoplay();
        timer = setInterval(() => {
          goToSlide(currentIndex + 1);
        }, speed);
      }

      function stopAutoplay() {
        if (timer) clearInterval(timer);
      }

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          goToSlide(currentIndex - 1);
          startAutoplay();
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          goToSlide(currentIndex + 1);
          startAutoplay();
        });
      }

      dots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
          goToSlide(idx);
          startAutoplay();
        });
      });

      show.addEventListener('mouseenter', stopAutoplay);
      show.addEventListener('mouseleave', startAutoplay);

      startAutoplay();
    });
  }

  function initAll(container) {
    initAccordions(container);
    initTabs(container);
    initSliders(container);
    initBeforeAfter(container);
    initCopyButtons(container);
    initSlideshows(container);
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll());
  } else {
    initAll();
  }

  // Support Shopify Theme Editor events for dynamic re-rendering
  document.addEventListener('shopify:section:load', (e) => {
    initAll(e.target);
  });
  document.addEventListener('shopify:section:select', (e) => {
    initAll(e.target);
  });
  document.addEventListener('shopify:block:select', (e) => {
    const parent = e.target.closest('.shopify-section') || e.target;
    initAll(parent);
  });

  window.UniversalSectionLibrary = {
    initAll: initAll
  };
})();
