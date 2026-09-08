// Global custom cursor: a small dot that morphs into a "view case study"
// pill over project thumbnails, or a caption pill (camera icon + short
// descriptive text) over about-page photos. Mirrors rachelchen.tech's cursor.
document.addEventListener('DOMContentLoaded', () => {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return; // leave the real cursor alone on touch devices

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.innerHTML = `
    <svg class="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
    <svg class="icon-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 8h3l1.6-2.4A2 2 0 0 1 10.2 4.6h3.6a2 2 0 0 1 1.6 1L17 8h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/>
      <circle cx="12" cy="14" r="3.5"/>
    </svg>
    <span class="cursor-label"></span>`;
  document.body.appendChild(dot);
  const label = dot.querySelector('.cursor-label');

  document.addEventListener('mousemove', (e) => {
    dot.style.transform = `translate(-50%, -50%) translate(${e.clientX}px, ${e.clientY}px)`;
  });

  document.querySelectorAll('.project-image').forEach(img => {
    const text = img.dataset.cursorLabel || 'View Case Study';
    img.addEventListener('mouseenter', () => {
      label.textContent = text;
      dot.classList.remove('photo-mode');
      dot.classList.add('expanded');
    });
    img.addEventListener('mouseleave', () => {
      dot.classList.remove('expanded');
    });
  });

  document.querySelectorAll('.photo-block').forEach(photo => {
    const caption = photo.dataset.caption || 'Behind The Scenes';
    photo.addEventListener('mouseenter', () => {
      label.textContent = caption;
      dot.classList.add('expanded', 'photo-mode');
    });
    photo.addEventListener('mouseleave', () => {
      dot.classList.remove('expanded', 'photo-mode');
    });
  });
});

// Fade-in reveal on scroll
document.addEventListener('DOMContentLoaded', () => {
  const revealEls = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: 0.1 });
  revealEls.forEach(el => io.observe(el));

  // Case study scrollspy: highlight whichever section's heading has most
  // recently scrolled past the trigger line near the top of the viewport.
  // (A plain "is it intersecting" check can flag two adjacent sections at
  // once near a boundary, which is what made the wrong link light up.)
  const tocLinks = document.querySelectorAll('.case-toc a[href^="#"]');
  const sections = Array.from(document.querySelectorAll('.case-section[id]'));
  if (tocLinks.length && sections.length) {
    const TRIGGER = 160; // px from top of viewport
    const setActive = () => {
      let current = sections[0];
      for (const sec of sections) {
        if (sec.getBoundingClientRect().top - TRIGGER <= 0) current = sec;
      }
      // The final section is often too short to ever cross the trigger line,
      // so once the page is scrolled to the bottom it always wins.
      const _doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= _doc.scrollHeight - 2) {
        current = sections[sections.length - 1];
      }
      tocLinks.forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${current.id}`);
      });
    };
    document.addEventListener('scroll', setActive, { passive: true });
    window.addEventListener('resize', setActive);
    setActive();
  }
});

// Tap/click a case image to view it full screen; tap again to zoom to
// full resolution and pan. Delegated so it also works after route changes.
(function () {
  let overlay, lbImg;
  function build() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">\u00d7</button><img alt="">';
    document.body.appendChild(overlay);
    lbImg = overlay.querySelector('img');
    overlay.addEventListener('click', function (e) {
      if (e.target === lbImg) { overlay.classList.toggle('zoomed'); return; }
      close();
    });
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('open', 'zoomed');
    lbImg.removeAttribute('src');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    const hit = e.target.closest && e.target.closest('.case-cover img, .case-figure img');
    if (!hit) return;
    e.preventDefault();
    if (!overlay) build();
    lbImg.src = hit.currentSrc || hit.src;
    lbImg.alt = hit.alt || '';
    overlay.scrollTop = 0; overlay.scrollLeft = 0;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
