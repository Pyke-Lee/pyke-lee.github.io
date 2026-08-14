function toggleMenu() {
  const menu = document.getElementById('menu');
  const overlay = document.getElementById('overlay');
  const isOpen = menu.classList.toggle('open');
  overlay.classList.toggle('show', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';

  const btn = document.querySelector('button[aria-controls="menu"]');
  if (btn) btn.setAttribute('aria-expanded', String(isOpen));

  if (isOpen) {
    const title = menu.querySelector('.menu-title');
    if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const menu = document.getElementById('menu');
    const overlay = document.getElementById('overlay');
    if (menu.classList.contains('open')) {
      menu.classList.remove('open');
      overlay.classList.remove('show');
      document.body.style.overflow = '';
      const btn = document.querySelector('button[aria-controls="menu"]');
      if (btn) btn.setAttribute('aria-expanded','false');
    }
  }
});

/* 현재 페이지 메뉴 자동 강조 (절대경로 기준) */
(function highlightActive() {
  // 예: /directx/team/tales_of_arise/  (index.html은 제거)
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.submenu a').forEach(a => {
    const href = new URL(a.getAttribute('href'), location.origin).pathname;
    if (href === here) a.classList.add('active');
  });
})();
