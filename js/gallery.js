(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  /* ---------- effect064: jelly-pop gallery ---------- */
  var gallery = document.querySelector('.mwg-gallery');
  if (gallery) {
    var stage = gallery.querySelector('.mwg-gallery__stage');
    var items = Array.prototype.slice.call(gallery.querySelectorAll('.mwg-media'));
    var N = items.length || 1;
    var GOLDEN = Math.PI * (3 - Math.sqrt(5));
    var popping = false;

    function layout() {
      var vw = stage.clientWidth || gallery.clientWidth || window.innerWidth;
      var vh = stage.clientHeight || gallery.clientHeight || window.innerHeight;
      var cx = vw / 2;
      var cy = vh / 2;
      var minDim = Math.min(vw, vh);
      var minR = minDim * 0.24;
      var maxR = minDim * 0.5;

      items.forEach(function (el, i) {
        var angle = i * GOLDEN;
        var rn = Math.sqrt((i + 0.5) / N);
        var r = minR + rn * (maxR - minR);
        var x = cx + Math.cos(angle) * r;
        var y = cy + Math.sin(angle) * r;
        var w = el.offsetWidth || 170;
        var h = el.offsetHeight || 220;
        var m = 10;
        x = clamp(x, w / 2 + m, vw - w / 2 - m);
        y = clamp(y, h / 2 + m, vh - h / 2 - m);

        el.style.left = Math.round(x) + 'px';
        el.style.top = Math.round(y) + 'px';
        if (window.gsap) {
          gsap.set(el, { xPercent: -50, yPercent: -50 });
        } else {
          el.style.transform = 'translate(-50%, -50%)';
        }
      });
    }

    function showAll() {
      items.forEach(function (el) {
        el.style.opacity = '1';
      });
    }

    function popIn() {
      if (!window.gsap) {
        showAll();
        return;
      }
      popping = true;
      gsap.killTweensOf(items);
      gsap.set(items, { opacity: 0, scale: 0.18 });
      gsap.to(items, {
        opacity: 1,
        scale: 1,
        duration: reduceMotion ? 0.01 : 1.15,
        ease: reduceMotion ? 'none' : 'elastic.out(1, 0.62)',
        stagger: reduceMotion ? 0 : { each: 0.075, from: 'random' },
        onComplete: function () {
          popping = false;
        }
      });
    }

    function reset() {
      if (!window.gsap) {
        items.forEach(function (el) {
          el.style.opacity = '0';
        });
        return;
      }
      gsap.killTweensOf(items);
      gsap.set(items, { opacity: 0, scale: 0.18 });
    }

    // slight enlarge on hover
    items.forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (!window.gsap || reduceMotion || popping) return;
        gsap.to(el, { scale: 1.07, duration: 0.35, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        if (!window.gsap || reduceMotion || popping) return;
        gsap.to(el, { scale: 1, duration: 0.35, ease: 'power2.out' });
      });
    });

    layout();

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(layout, 140);
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              popIn();
            } else {
              reset();
            }
          });
        },
        { threshold: 0.3 }
      );
      io.observe(gallery);
    } else {
      popIn();
    }
  }

  /* ---------- lightbox: click to enlarge / play ---------- */
  var lb = document.getElementById('xhsLightbox');
  var lbBody = document.getElementById('xhsLightboxBody');
  var lbClose = lb ? lb.querySelector('.xhs-lightbox__close') : null;

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      if (lbBody) lbBody.innerHTML = '';
    }, 320);
  }

  function openLightbox(btn) {
    if (!lb || !lbBody) return;
    var type = btn.getAttribute('data-type');
    var src = btn.getAttribute('data-src');
    lbBody.innerHTML = '';

    if (type === 'video') {
      var v = document.createElement('video');
      v.src = src;
      v.controls = true;
      v.autoplay = true;
      v.setAttribute('playsinline', '');
      var poster = btn.getAttribute('data-poster');
      if (poster) v.poster = poster;
      lbBody.appendChild(v);
    } else {
      var img = document.createElement('img');
      img.src = src;
      img.alt = btn.getAttribute('aria-label') || '';
      lbBody.appendChild(img);
    }

    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  if (lb) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.mwg-media') : null;
      if (btn) {
        openLightbox(btn);
        return;
      }
      if (!lb.classList.contains('open')) return;
      var tag = e.target.tagName;
      if (e.target === lb || e.target === lbBody || tag === 'IMG') {
        closeLightbox();
      }
    });

    if (lbClose) lbClose.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
    });
  }
})();
