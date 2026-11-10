/* =========================================================
   수화담 — 공통 동작
   ========================================================= */
(function () {
  document.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CAMERA = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';

  /* ---------- 사진 빈 자리 틀 ----------
     사진 파일이 없으면 같은 크기의 빈 자리 틀("사진 자리 · 파일이름")을 보여줍니다.
     images 폴더에 같은 이름의 파일을 넣고 새로고침하면 사진이 저절로 나옵니다. */
  function showEmpty(img) {
    var box = img.closest('.ph-box');
    if (!box || box.classList.contains('is-empty')) return;
    box.classList.add('is-empty');
    var file = (img.getAttribute('src') || '').split('/').pop();
    var el = document.createElement('span');
    el.className = 'ph-empty';
    el.innerHTML = CAMERA + '<span>사진 자리 · ' + file + '</span>';
    box.appendChild(el);
  }
  document.querySelectorAll('.ph-box img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) showEmpty(img);
    img.addEventListener('error', function () { showEmpty(img); });
  });

  /* ---------- 첫 화면: 영상·사진이 있으면 hero--media ---------- */
  var hero = document.querySelector('.hero');
  if (hero) {
    var hImg = hero.querySelector('.hero-arch img');
    var hVid = hero.querySelector('.hero-arch video');
    var markMedia = function () { hero.classList.add('hero--media'); };
    if (hImg) {
      if (hImg.complete && hImg.naturalWidth > 0) markMedia();
      hImg.addEventListener('load', markMedia);
    }
    if (hVid) {
      hVid.addEventListener('loadeddata', function () { markMedia(); hero.classList.add('has-video'); });
      hVid.addEventListener('error', function () { hVid.remove(); }, true);
      var src = hVid.querySelector('source');
      if (src) src.addEventListener('error', function () { hVid.remove(); });
      if (reduce) hVid.pause();
    }
  }

  /* ---------- 상단 메뉴 ---------- */
  var header = document.querySelector('.site-header');
  var onScroll = function () { header && header.classList.toggle('is-scrolled', window.scrollY > 24); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('is-open'); header.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- 스크롤 등장 ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    // 같은 묶음 안의 카드는 0.08초 간격으로
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      group.querySelectorAll(':scope > .reveal').forEach(function (el, i) { el.style.setProperty('--d', (i * 0.08) + 's'); });
    });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 대형 이미지 띠: 천천히 다르게 움직임(패럴랙스) ---------- */
  var bands = document.querySelectorAll('.band .ph-box img');
  if (bands.length && !reduce) {
    var ticking = false;
    var parallax = function () {
      var vh = window.innerHeight;
      bands.forEach(function (img) {
        var r = img.closest('.band').getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh; // -1 ~ 1
        img.style.transform = 'translate3d(0,' + (p * -6) + '%,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(parallax); ticking = true; } }, { passive: true });
    parallax();
  }

  /* ---------- 가로 슬라이드 버튼 ---------- */
  document.querySelectorAll('[data-slider]').forEach(function (wrap) {
    var track = wrap.querySelector('.slider');
    var step = function (dir) { track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }); };
    var prev = wrap.querySelector('[data-prev]');
    var next = wrap.querySelector('[data-next]');
    prev && prev.addEventListener('click', function () { step(-1); });
    next && next.addEventListener('click', function () { step(1); });
  });

  /* ---------- 갤러리 분류 ---------- */
  var filters = document.querySelector('.filters');
  if (filters) {
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var cat = b.getAttribute('data-filter');
      filters.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('.g-grid .m-item').forEach(function (it) {
        it.hidden = !(cat === 'all' || it.getAttribute('data-cat') === cat);
      });
    });
  }

  /* ---------- 사진 확대 보기 (다음·이전) ---------- */
  var lb = document.getElementById('lightbox');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-cap');
    var list = [], idx = 0, lastFocus = null;
    var items = function (group) {
      return Array.prototype.filter.call(document.querySelectorAll('[data-zoom="' + group + '"]'), function (el) {
        var box = el.querySelector('.ph-box');
        return !el.hidden && !(box && box.classList.contains('is-empty'));
      });
    };
    var show = function (i) {
      idx = (i + list.length) % list.length;
      var el = list[idx], img = el.querySelector('img');
      lbImg.src = img.getAttribute('src');
      lbImg.alt = img.getAttribute('alt') || '';
      lbCap.textContent = (el.getAttribute('data-caption') || img.getAttribute('alt') || '') + '  (' + (idx + 1) + ' / ' + list.length + ')';
    };
    var open = function (el) {
      list = items(el.getAttribute('data-zoom'));
      if (!list.length) return;
      lastFocus = el;
      show(list.indexOf(el));
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    };
    var close = function () { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-zoom]');
      if (el) { e.preventDefault(); open(el); }
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* 올해 연도 */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
