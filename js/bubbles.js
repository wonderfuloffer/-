(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var bubbles = Array.prototype.slice.call(document.querySelectorAll('.bubble'));
  if (!bubbles.length) return;

  var stage =
    document.querySelector('.mp-hero__row') ||
    document.querySelector('.bubbles') ||
    document.querySelector('.detail-hero');

  function spawnBurst(bubble) {
    if (!stage) return;
    var boxRect = stage.getBoundingClientRect();
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
      var dist = 46 + Math.random() * 74;
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      burst.appendChild(p);
    }

    stage.appendChild(burst);
    window.setTimeout(function () {
      burst.remove();
    }, 800);
  }

  function restoreBubbles() {
    bubbles.forEach(function (bubble) {
      bubble.classList.remove('pop');
    });
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

  // 回到首屏时泡泡恢复
  var hero = document.querySelector('.detail-hero');
  if (hero && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) restoreBubbles();
        });
      },
      { threshold: 0.15 }
    );
    io.observe(hero);
  }
})();
