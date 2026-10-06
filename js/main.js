/* Zoey personal website — interactions */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- reveal-on-scroll ---------- */
  document.body.classList.add('reveal-ready');

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- navigation ---------- */
  const nav = document.getElementById('siteNav');
  const burger = document.getElementById('navBurger');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- hero mouse-follow spotlight + parallax ---------- */
  const hero = document.querySelector('.hero');
  if (hero) {
    const spotlight = hero.querySelector('.hero-spotlight');
    const copy = hero.querySelector('.hero-copy');
    const orbs = hero.querySelectorAll('.orb');
    const spots = hero.querySelectorAll('.spot');
    const facts = hero.querySelector('#heroFacts');
    let rafId = null;

    function setCenter() {
      if (!copy) return;
      const r = hero.getBoundingClientRect();
      const c = copy.getBoundingClientRect();
      const sx = c.left - r.left + c.width / 2;
      const sy = c.top - r.top + c.height / 2;
      hero.style.setProperty('--spotlight-x', sx + 'px');
      hero.style.setProperty('--spotlight-y', sy + 'px');
    }

    function onMove(e) {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = x / rect.width - 0.5;
      const ny = y / rect.height - 0.5;

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        hero.style.setProperty('--spotlight-x', x + 'px');
        hero.style.setProperty('--spotlight-y', y + 'px');

        if (copy && !reduceMotion) {
          copy.style.transform = 'translate(' + nx * -9 + 'px,' + ny * -7 + 'px)';
        }
        if (!reduceMotion) {
          orbs.forEach((orb, i) => {
            const power = [16, 26, 10][i] || 10;
            orb.style.transform =
              'translate(' + nx * power + 'px,' + ny * power + 'px)';
          });
          spots.forEach((spot) => {
            const depth = parseFloat(spot.dataset.depth || '1');
            const power = 22 * depth;
            spot.style.setProperty('--tx', nx * power + 'px');
            spot.style.setProperty('--ty', ny * power + 'px');
          });
        }
        rafId = null;
      });
    }

    setCenter();
    hero.addEventListener('mousemove', onMove, { passive: true });
    hero.addEventListener('mouseleave', () => {
      if (copy && !reduceMotion) copy.style.transform = '';
      orbs.forEach((orb) => (orb.style.transform = ''));
      spots.forEach((spot) => {
        spot.style.setProperty('--tx', '0px');
        spot.style.setProperty('--ty', '0px');
      });
      setCenter();
    });
    window.addEventListener('resize', setCenter);

    // Reveal hero spotlight only after entrance animation settles.
    window.setTimeout(() => {
      hero.classList.add('is-ready');
      // Unlock pointer-driven shader light once the entrance settles.
      window.dispatchEvent(new Event('kin:cursor-unlock'));
    }, reduceMotion ? 0 : 750);
    if (facts && facts.children.length) {
      // Facts stagger like the reference entrance.
      Array.from(facts.children).forEach((li, i) => {
        li.style.transitionDelay = 0.15 + i * 0.08 + 's';
      });
    }
  }

  /* ---------- capabilities carousel ---------- */
  const cards = Array.from(document.querySelectorAll('.cap-card'));
  const tabs = Array.from(document.querySelectorAll('.cap-tab'));
  const dots = Array.from(document.querySelectorAll('#capProgress i'));
  const prevBtn = document.getElementById('capPrev');
  const nextBtn = document.getElementById('capNext');
  const capSection = document.getElementById('capabilities');
  let active = 0;
  const total = cards.length;

  function centeredOffset(i, current) {
    let d = i - current;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  }

  function posClass(i, current) {
    const d = centeredOffset(i, current);
    if (d === 0) return 'active';
    if (d === -1) return 'left-1';
    if (d === 1) return 'right-1';
    return 'hidden';
  }

  function paint() {
    cards.forEach((card, i) => {
      const keep = ['cap-card', posClass(i, active)];
      card.classList.remove(
        'active',
        'left-1',
        'right-1',
        'left-2',
        'right-2',
        'hidden'
      );
      card.classList.add(...keep);
    });

    tabs.forEach((tab, i) => {
      const on = i === active;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
    });

    dots.forEach((dot, i) => dot.classList.toggle('on', i === active));
  }

  function goTo(index) {
    active = (index + total) % total;
    paint();
  }

  function move(dir) {
    goTo(active + dir);
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (i !== active) {
        // Clicking a side image brings it to the centre (same as the reference).
        e.preventDefault();
        goTo(i);
      }
    });
  });

  // Fallback: with 3D perspective the projected side cards can be hard to hit,
  // so clicks on the left/right area of the stage always move the carousel.
  const stageEl = document.getElementById('capStage');
  if (stageEl) {
    stageEl.addEventListener('click', (e) => {
      const card = e.target.closest('.cap-card');
      if (card && card.classList.contains('active')) return; // let the link open details
      const rect = stageEl.getBoundingClientRect();
      e.preventDefault();
      if (e.clientX < rect.left + rect.width / 2) move(-1);
      else move(1);
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => goTo(i));
  });

  if (prevBtn) prevBtn.addEventListener('click', () => move(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => move(1));

  document.addEventListener('keydown', (e) => {
    if (!capSection) return;
    const r = capSection.getBoundingClientRect();
    const visible = r.top < window.innerHeight && r.bottom > 0;
    if (!visible) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    }
  });

  paint();

  /* ---------- case cards: mouse-follow animation ---------- */
  const caseCards = document.querySelectorAll('.case-card');
  caseCards.forEach((card) => {
    let raf = null;
    const art = card.querySelector('.case-art');

    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nx = x / rect.width - 0.5;
      const ny = y / rect.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
        if (art && !reduceMotion) {
          art.style.transform =
            'translate(' + nx * -16 + 'px,' + ny * -16 + 'px)';
        }
        raf = null;
      });
    });

    card.addEventListener('pointerleave', () => {
      if (raf) cancelAnimationFrame(raf);
      card.style.removeProperty('--mouse-x');
      card.style.removeProperty('--mouse-y');
      if (art) art.style.transform = '';
    });
  });
})();
