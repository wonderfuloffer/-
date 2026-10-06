/* Detail-page title pop — Jelly-style entrance inspired by effect 089 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h1 = document.querySelector('.detail-hero h1');
  if (!h1) return;

  const text = h1.textContent;
  const fragment = document.createDocumentFragment();
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'ch';
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    fragment.appendChild(span);
  }
  h1.textContent = '';
  h1.appendChild(fragment);

  if (!window.gsap || reduceMotion) return;

  const chars = Array.from(h1.querySelectorAll('.ch'));
  const kicker = document.querySelector('.detail-hero .kicker');
  document.body.classList.add('detail-title-anim');

  gsap.set(chars, {
    yPercent: 110,
    scaleY: 0.42,
    scaleX: 1.28,
    rotation: 5,
    opacity: 0,
    transformOrigin: '50% 50%',
  });

  if (kicker) {
    gsap.set(kicker, { y: 16, autoAlpha: 0 });
  }

  const tl = gsap.timeline({ delay: 0.12 });
  if (kicker) {
    tl.to(kicker, {
      y: 0,
      autoAlpha: 1,
      duration: 0.7,
      ease: 'power3.out',
    });
  }
  tl.to(
    chars,
    {
      yPercent: 0,
      scaleY: 1,
      scaleX: 1,
      rotation: 0,
      opacity: 1,
      duration: 1.35,
      ease: 'elastic.out(1, 0.6)',
      stagger: { each: 0.07, from: 'start' },
    },
    0.08
  );
})();
