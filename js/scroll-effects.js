(function () {
  'use strict';

  if (!window.gsap) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------
     effect089 — Jelly headline motion
     The big headline skews/stretches with scroll velocity.
  ---------------------------------------------------------------- */
  function initJelly() {
    var h1 = document.querySelector('.detail-hero h1');
    if (!h1) return;

    h1.style.transformOrigin = '50% 100%';
    h1.style.willChange = 'transform';

    var lastY = window.scrollY;
    var skew = 0;
    var scaleY = 1;

    gsap.ticker.add(function () {
      var y = window.scrollY;
      var delta = y - lastY;
      lastY = y;

      var targetSkew = gsap.utils.clamp(-18, 18, delta * 1.15);
      skew += (targetSkew - skew) * 0.13;

      var targetScale = 1 - Math.abs(skew) * 0.006;
      scaleY += (targetScale - scaleY) * 0.13;

      h1.style.transform = 'skewX(' + skew + 'deg) scaleY(' + scaleY + ')';
    });
  }

  /* ----------------------------------------------------------------
     effect097 — line-by-line scale
     Every text line, as it enters from the bottom, is enlarged and
     smoothly shrinks back to normal size as it rises into place.
  ---------------------------------------------------------------- */
  var MAX_SCALE = 1.3;

  function collectTokens(node, bold, italic, out) {
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        Array.from(child.nodeValue).forEach(function (ch) {
          out.push({ ch: ch, bold: bold, italic: italic });
        });
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        var cs = window.getComputedStyle(child);
        var isBold = bold || tag === 'strong' || tag === 'b' || parseInt(cs.fontWeight, 10) >= 600;
        var isItalic = italic || tag === 'em' || tag === 'i' || cs.fontStyle === 'italic';
        collectTokens(child, isBold, isItalic, out);
      }
    });
  }

  function splitIntoLines(el) {
    var tokens = [];
    collectTokens(el, false, false, tokens);
    if (!tokens.length) return [];

    el.textContent = '';
    var spans = [];

    tokens.forEach(function (t) {
      var isSpace = t.ch === ' ' || t.ch === '\n' || t.ch === '\t';
      var s = document.createElement('span');
      s.textContent = isSpace ? ' ' : t.ch;
      if (!isSpace) {
        if (t.bold) s.style.fontWeight = '600';
        if (t.italic) s.style.fontStyle = 'italic';
      }
      el.appendChild(s);
      spans.push(s);
    });

    // Force layout so line tops are measurable.
    void el.offsetWidth;

    var lines = [];
    var current = null;
    var lastTop = null;
    spans.forEach(function (s) {
      var top = s.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 2) {
        current = [];
        lines.push(current);
        lastTop = top;
      }
      current.push(s);
    });

    var lineEls = [];
    lines.forEach(function (line) {
      var le = document.createElement('span');
      le.className = 'tl';
      line.forEach(function (s) {
        le.appendChild(s);
      });
      el.appendChild(le);
      lineEls.push(le);
    });
    return lineEls;
  }

  function initLineScale() {
    var els = document.querySelectorAll('[data-tighten], .case-title, .case-article p');
    var items = [];

    Array.prototype.forEach.call(els, function (el) {
      splitIntoLines(el).forEach(function (lineEl) {
        gsap.set(lineEl, { transformOrigin: '50% 100%' });
        items.push({ el: lineEl, scale: 0, target: 0, docTop: 0 });
      });
    });

    if (!items.length) return;

    function measure() {
      // Measure from the real layout position (no transform).
      items.forEach(function (it) {
        gsap.set(it.el, { scale: 1 });
      });
      void document.body.offsetHeight;
      var sy = window.scrollY;
      items.forEach(function (it) {
        it.docTop = it.el.getBoundingClientRect().top + sy;
      });
    }

    function computeTargets() {
      var vh = window.innerHeight || 1;
      var sy = window.scrollY;
      items.forEach(function (it) {
        var top = it.docTop - sy;
        // 0 while entering from the bottom, 1 once settled higher up.
        var p = gsap.utils.clamp(0, 1, (vh - top) / (vh * 0.62));
        it.target = MAX_SCALE - (MAX_SCALE - 1) * p;
      });
    }

    function tick() {
      items.forEach(function (it) {
        var diff = it.target - it.scale;
        if (Math.abs(diff) < 0.0006) {
          it.scale = it.target;
        } else {
          it.scale += diff * 0.16;
        }
        gsap.set(it.el, { scale: it.scale });
      });
    }

    measure();
    computeTargets();
    items.forEach(function (it) {
      it.scale = it.target;
    });

    window.addEventListener('scroll', function () {
      requestAnimationFrame(computeTargets);
    }, { passive: true });
    window.addEventListener('resize', function () {
      measure();
      computeTargets();
    });

    gsap.ticker.add(tick);
  }

  if (reduceMotion) return;

  initJelly();
  initLineScale();
})();
