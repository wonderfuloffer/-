(function () {
  'use strict';

  if (!window.gsap) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var POP = '.wb-step__media, .wb-pair__main, .wb-pair__pop, .koc-group, .koc-row figure';
  var HOVER = '.wb-step__media, .wb-pair__main, .wb-pair__pop, .koc-stack, .koc-row figure';
  var ZOOM = '.wb-step__media, .wb-pair__main, .wb-pair__pop, .koc-row figure';

  function all(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  /* ---------- 果冻式弹出 ---------- */
  var popEls = all(POP);
  if (popEls.length) {
    gsap.set(popEls, { opacity: 0, scale: 0.86, transformOrigin: '50% 50%' });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            var el = entry.target;
            if (!entry.isIntersecting) return;
            io.unobserve(el);
            el.__popping = true;
            gsap.to(el, {
              opacity: 1,
              scale: 1,
              duration: reduceMotion ? 0.01 : 1.0,
              ease: reduceMotion ? 'none' : 'elastic.out(1, 0.62)',
              overwrite: true,
              onComplete: function () {
                el.__popping = false;
              }
            });
          });
        },
        { threshold: 0.12 }
      );
      popEls.forEach(function (el) {
        io.observe(el);
      });
    } else {
      gsap.set(popEls, { opacity: 1, scale: 1 });
    }
  }

  /* ---------- 悬停轻微放大 ---------- */
  if (!reduceMotion) {
    all(HOVER).forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (el.__popping) return;
        gsap.to(el, { scale: 1.04, duration: 0.35, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        if (el.__popping) return;
        gsap.to(el, { scale: 1, duration: 0.35, ease: 'power2.out' });
      });
    });
  }

  /* ---------- KOC 笔记堆叠：点击切换下一张 ---------- */
  all('.koc-stack').forEach(function (stack) {
    if (!stack.querySelector('.koc-flip')) {
      var badge = document.createElement('span');
      badge.className = 'koc-flip';
      badge.setAttribute('aria-hidden', 'true');
      badge.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="23 4 23 10 17 10"></polyline>' +
        '<polyline points="1 20 1 14 7 14"></polyline>' +
        '<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>' +
        '</svg>点击翻页';
      stack.appendChild(badge);
    }

    var imgs = Array.prototype.slice.call(stack.querySelectorAll('img'));
    var n = imgs.length || 1;
    var idx = 0;

    function paint() {
      imgs.forEach(function (img, i) {
        var pos = (i - idx + n) % n;
        var t;
        var op;
        var z;
        if (pos === 0) {
          t = 'translate(0, 0) rotate(0deg) scale(1)';
          op = 1;
          z = 30;
        } else if (pos === 1) {
          t = 'translate(-14px, -14px) rotate(-2.5deg) scale(0.96)';
          op = 1;
          z = 20;
        } else {
          t = 'translate(-28px, -28px) rotate(-5deg) scale(0.92)';
          op = 0.85;
          z = 10;
        }
        img.style.transform = t;
        img.style.opacity = String(op);
        img.style.zIndex = String(z);
      });
    }

    function next() {
      idx = (idx + 1) % n;
      paint();
    }

    paint();
    stack.addEventListener('click', next);
    stack.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        next();
      }
    });
  });

  /* ---------- 点击查看大图 ---------- */
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

  function openLightbox(img) {
    if (!lb || !lbBody) return;
    lbBody.innerHTML = '';
    var big = document.createElement('img');
    big.src = img.getAttribute('src');
    big.alt = img.getAttribute('alt') || '';
    lbBody.appendChild(big);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  all(ZOOM).forEach(function (el) {
    el.style.cursor = 'zoom-in';
    el.addEventListener('click', function () {
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) openLightbox(img);
    });
  });

  if (lb) {
    if (lbClose) lbClose.addEventListener('click', closeLightbox);

    document.addEventListener('click', function (e) {
      if (!lb.classList.contains('open')) return;
      var inZoom = e.target.closest ? e.target.closest(ZOOM) : null;
      if (inZoom) return;
      if (e.target === lb || e.target === lbBody || e.target.tagName === 'IMG') {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
    });
  }
})();
