(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bubbles = Array.prototype.slice.call(document.querySelectorAll('.bubble'));
  var bubblesBox = document.querySelector('.bubbles');
  var hint = document.querySelector('.bubble-hint');

  function spawnBurst(bubble) {
    if (!bubblesBox) return;

    var boxRect = bubblesBox.getBoundingClientRect();
    var bRect = bubble.getBoundingClientRect();
    var cx = bRect.left + bRect.width / 2 - boxRect.left;
    var cy = bRect.top + bRect.height / 2 - boxRect.top;

    var burst = document.createElement('span');
    burst.className = 'burst';
    burst.style.left = cx + 'px';
    burst.style.top = cy + 'px';

    var count = 12;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('i');
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      var dist = 62 + Math.random() * 92;
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      burst.appendChild(p);
    }

    bubblesBox.appendChild(burst);
    window.setTimeout(function () {
      burst.remove();
    }, 800);
  }

  bubbles.forEach(function (bubble) {
    bubble.addEventListener('click', function () {
      if (bubble.classList.contains('pop')) return;

      var targetId = bubble.getAttribute('data-target');
      var target = targetId ? document.getElementById(targetId) : null;

      bubble.classList.add('pop');
      if (!reduceMotion) spawnBurst(bubble);

      var jump = function () {
        if (target) {
          target.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start'
          });
        }
      };

      if (reduceMotion) {
        jump();
      } else {
        window.setTimeout(jump, 340);
      }
    });
  });

  // When the user scrolls back up to the hero, restore any popped bubbles.
  function restoreBubbles() {
    bubbles.forEach(function (bubble) {
      bubble.classList.remove('pop');
    });
  }

  var hero = document.querySelector('.xhs-hero');
  if (hero && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) restoreBubbles();
      });
    }, { threshold: 0.15 });
    io.observe(hero);
  }

  // 泡泡行的入场动画，与 effect089 的标题果冻弹出形成呼应。
  if (window.gsap && !reduceMotion && bubblesBox) {
    gsap.fromTo(
      bubblesBox,
      { y: 26, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out', delay: 0.32 }
    );
    if (hint) {
      gsap.fromTo(
        hint,
        { y: 12, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', delay: 0.55 }
      );
    }
  }
})();
