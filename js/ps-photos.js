(function () {
  'use strict';

  var lb = document.getElementById('xhsLightbox');
  var lbBody = document.getElementById('xhsLightboxBody');
  var lbClose = lb ? lb.querySelector('.xhs-lightbox__close') : null;

  function closeLightbox() {
    if (!lb) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () {
      if (lbBody) lbBody.innerHTML = '';
    }, 320);
  }

  function openLightbox(btn) {
    if (!lb || !lbBody) return;
    var img = btn.querySelector('img');
    if (!img) return;
    lbBody.innerHTML = '';
    var big = document.createElement('img');
    big.src = btn.getAttribute('data-src') || img.getAttribute('src');
    big.alt = img.getAttribute('alt') || '';
    lbBody.appendChild(big);
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.ps-photo__btn') : null;
    if (btn) {
      e.preventDefault();
      openLightbox(btn);
      return;
    }
    if (!lb || !lb.classList.contains('open')) return;
    if (e.target === lb || e.target === lbBody || e.target.tagName === 'IMG') {
      closeLightbox();
    }
  });

  if (lbClose) lbClose.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb && lb.classList.contains('open')) closeLightbox();
  });
})();
