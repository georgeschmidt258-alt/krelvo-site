/* KRELVO site interactions. Loaded with defer; it pulls in gsap, ScrollTrigger and lenis itself on desktop.
   Everything here degrades: without JS, WebGL or motion the pages stay fully readable. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Animation libraries are a desktop enhancement: phones and reduced motion never download them.
  const enhance = fine && !reduced;
  const loadScript = (src) => new Promise((ok, no) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = no; document.head.append(el); });
  const vendors = enhance
    ? loadScript('/assets/vendor/gsap.min.js').then(() => Promise.all([loadScript('/assets/vendor/ScrollTrigger.min.js'), loadScript('/assets/vendor/lenis.min.js')])).then(() => { window.gsap.registerPlugin(window.ScrollTrigger); return window.gsap; })
    : Promise.reject();
  vendors.catch(() => {});

  /* ── navigation ─────────────────────────────────────────── */
  const header = $('.site-header'), menuBtn = $('.menu-btn'), links = $('#nav-links');
  const onScrollHeader = () => header && header.classList.toggle('is-stuck', scrollY > 24);
  addEventListener('scroll', onScrollHeader, { passive: true }); onScrollHeader();
  let lenis = null;
  if (menuBtn && links) {
    let lockY = 0;
    const isOpen = () => menuBtn.getAttribute('aria-expanded') === 'true';
    // iOS ignores overflow:hidden for touch drags, so drags outside the menu's own scroller are cancelled too
    const blockTouch = (e) => { if (!e.target.closest('.nav-links')) e.preventDefault(); };
    const setMenu = (open) => {
      if (open === isOpen()) return;
      if (open) lockY = scrollY;
      links.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.querySelector('span').textContent = open ? 'Close' : 'Menu';
      if (open) { links.scrollTop = 0; document.addEventListener('touchmove', blockTouch, { passive: false }); }
      else { document.removeEventListener('touchmove', blockTouch); if (Math.abs(scrollY - lockY) > 1) scrollTo({ top: lockY, behavior: 'instant' }); }
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    menuBtn.addEventListener('click', () => setMenu(!isOpen()));
    // a tap on a link closes it, and so does a tap on the empty backdrop
    links.addEventListener('click', (e) => { if (e.target.closest('a') || e.target === links) setMenu(false); });
    addEventListener('pagehide', () => setMenu(false));
    addEventListener('pageshow', () => setMenu(false));
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); }
      if (e.key === 'Tab') { // keep focus inside the open menu
        const items = [menuBtn, ...$$('a', links)], i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    matchMedia('(min-width: 1001px)').addEventListener('change', (e) => e.matches && setMenu(false));
  }

  /* ── smooth scroll ──────────────────────────────────────── */
  vendors.then((gsap) => {
    lenis = new window.Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, anchors: { offset: -84 } });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }).catch(() => {});

  /* ── reveals and counters ───────────────────────────────── */
  const revealIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); revealIO.unobserve(e.target);
    $$('[data-count]', e.target).concat(e.target.matches('[data-count]') ? [e.target] : []).forEach(countUp);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-reveal]').forEach((el) => revealIO.observe(el));
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    const to = +el.dataset.count, pad = +(el.dataset.pad || 0), fmt = (v) => String(Math.round(v)).padStart(pad, '0');
    if (reduced) { el.textContent = fmt(to); return; }
    const from = +(el.dataset.from || 0), t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 1600), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ── magnetic buttons (desktop only) ─────────── */
  vendors.then((gsap) => {
    $$('[data-magnetic]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.28); y((e.clientY - r.top - r.height / 2) * 0.36); });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }).catch(() => {});

  /* ── tilt cards ─────────────────────────────────────────── */
  $$('[data-tilt]').forEach((card) => {
    if (reduced) return;
    const set = (px, py) => {
      card.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
      card.style.setProperty('--px', px.toFixed(3)); card.style.setProperty('--py', py.toFixed(3));
      card.style.setProperty('--mx', ((px + 1) * 50).toFixed(1) + '%'); card.style.setProperty('--my', ((py + 1) * 50).toFixed(1) + '%');
    };
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = card.getBoundingClientRect(); card.classList.add('is-tilting');
      set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    card.addEventListener('pointerleave', () => { card.classList.remove('is-tilting'); set(0, 0); });
  });
  const viewIO = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)), { threshold: 0.35 });
  $$('.game').forEach((g) => viewIO.observe(g));

  /* ── crash card: illustrative rising curve with a burst ─── */
  $$('[data-crash]').forEach((stage) => {
    const cv = $('canvas', stage), out = $('.crash-readout', stage), num = $('b', out), lab = $('span', out);
    const ctx = cv.getContext('2d'); let w = 0, h = 0, t = 0, last = 0, raf = 0, visible = false, end = 6.5, parts = [], boom = -1;
    const size = () => { const r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const mult = (s) => Math.exp(s * 0.21);
    let span = 3.5, top = 0.9;
    const pt = (s) => [w * (0.07 + 0.8 * s / span), h * (0.9 - 0.6 * (mult(s) - 1) / top)];
    function draw(time) {
      raf = 0; const dt = Math.min(0.05, (time - last) / 1000 || 0); last = time; t += dt;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(150,185,255,.08)'; ctx.lineWidth = 1;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 6); ctx.lineTo(w, h * i / 6); ctx.stroke(); }
      const live = Math.min(t, end), crashed = t >= end; span = Math.max(3.5, live); top = Math.max(0.9, mult(live) - 1);
      const g = ctx.createLinearGradient(0, h, w, 0); g.addColorStop(0, 'rgba(47,123,255,.2)'); g.addColorStop(1, crashed ? '#ff4d62' : '#8fc0ff');
      ctx.beginPath(); for (let s = 0; s <= live; s += 0.05) { const [x, y] = pt(s); s ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      const [hx, hy] = pt(live); ctx.lineTo(hx, hy);
      ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.shadowColor = crashed ? 'rgba(255,77,98,.9)' : 'rgba(47,123,255,.95)'; ctx.shadowBlur = 22; ctx.stroke(); ctx.shadowBlur = 0;
      ctx.lineTo(hx, h); ctx.lineTo(pt(0)[0], h); ctx.closePath(); const f = ctx.createLinearGradient(0, hy, 0, h); f.addColorStop(0, crashed ? 'rgba(255,77,98,.16)' : 'rgba(47,123,255,.2)'); f.addColorStop(1, 'rgba(47,123,255,0)'); ctx.fillStyle = f; ctx.fill();
      if (!crashed) { ctx.beginPath(); ctx.arc(hx, hy, 5.5, 0, 7); ctx.fillStyle = '#fff'; ctx.shadowColor = '#6aa8ff'; ctx.shadowBlur = 24; ctx.fill(); ctx.shadowBlur = 0; }
      if (crashed && boom < 0) { boom = t; for (let i = 0; i < 42; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 190; parts.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, l: 0.5 + Math.random() * 0.7, c: Math.random() > 0.4 ? '#ff4d62' : '#ffd0a6' }); } }
      if (boom >= 0) {
        const k = t - boom; ctx.beginPath(); ctx.arc(hx, hy, 8 + k * 150, 0, 7); ctx.strokeStyle = `rgba(255,120,130,${Math.max(0, 0.7 - k * 1.4)})`; ctx.lineWidth = 2; ctx.stroke();
        parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.l -= dt; if (p.l > 0) { ctx.globalAlpha = Math.min(1, p.l * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 2.6, 2.6); } }); ctx.globalAlpha = 1;
      }
      num.textContent = mult(live).toFixed(2) + '×'; out.classList.toggle('is-out', crashed); lab.textContent = crashed ? 'Car out' : 'Multiplier rising';
      if (t > end + 2.2) { t = 0; boom = -1; parts = []; end = 4.2 + Math.random() * 4.2; }
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    }
    const kick = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    size(); new ResizeObserver(() => { size(); if (reduced) still(); }).observe(stage);
    function still() { t = 5.2; end = 99; parts = []; last = performance.now(); draw(last); cancelAnimationFrame(raf); raf = 0; }
    if (reduced) { visible = false; still(); return; }
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }, { threshold: 0.1 }).observe(stage);
    document.addEventListener('visibilitychange', kick);
  });

  /* ── page transitions ─────────────────────────────────────
     Browsers with cross document View Transitions animate natively (see the stylesheet).
     Everywhere else, leave with a quick fade so navigation never flashes. */
  if (root.classList.contains('vt-fallback') && !reduced) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.pathname === location.pathname) return; // other sites and same page anchors behave normally
      e.preventDefault(); root.classList.add('is-leaving'); setTimeout(() => { location.href = a.href; }, 170);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) root.classList.remove('is-leaving'); });
  }

  /* ── recorded gameplay clip: plays only while visible ───── */
  $$('video.clip').forEach((v) => {
    const btn = $('.clip-toggle', v.closest('figure')); let wanted = !reduced, seen = false;
    const sync = () => { const on = wanted && seen && !document.hidden; if (on) v.play().catch(() => {}); else v.pause(); if (btn) { btn.textContent = wanted ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(!wanted)); } };
    if (btn) btn.addEventListener('click', () => { wanted = !wanted; sync(); });
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen && v.preload === 'none') v.preload = 'metadata'; sync(); }, { threshold: 0.25 }).observe(v);
    document.addEventListener('visibilitychange', sync); sync();
  });

  /* ── real prototype previews: keep offscreen frames idle ── */
  const frames = $$('.live-preview');
  if (frames.length) {
    const send = (f, v) => f.contentWindow && f.contentWindow.postMessage({ type: 'krelvo-preview-visibility', visible: v }, location.origin);
    const inView = (f) => { const r = f.getBoundingClientRect(); return !document.hidden && r.bottom > 0 && r.top < innerHeight; };
    const sync = () => frames.forEach((f) => send(f, inView(f)));
    const io = new IntersectionObserver((es) => es.forEach((e) => send(e.target, e.isIntersecting && !document.hidden)));
    // the frame only starts loading when the visitor gets near it
    const loadIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.src = e.target.dataset.src; loadIO.unobserve(e.target); } }), { rootMargin: '500px 0px' });
    frames.forEach((f) => { io.observe(f); f.addEventListener('load', sync); if (f.dataset.src) loadIO.observe(f); });
    addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.type === 'krelvo-preview-ready') sync(); });
    document.addEventListener('visibilitychange', sync);
  }

  /* ── enquiry form ───────────────────────────────────────── */
  const form = $('#enquiry-form');
  if (form) {
    const status = $('.form-status', form), done = $('.form-done', form);
    const check = (el) => {
      const err = $('#' + el.id + '-err'); let msg = '';
      if (el.validity.valueMissing) msg = 'Please fill this in.'; else if (el.validity.typeMismatch) msg = 'Please enter a valid email address.';
      el.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (err) err.textContent = msg; return !msg;
    };
    $$('input,textarea', form).forEach((el) => el.addEventListener('blur', () => el.required && el.value && check(el)));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = $$('[required]', form), bad = fields.filter((el) => !check(el));
      if (bad.length) { bad[0].focus(); status.textContent = 'Please check the highlighted fields.'; return; }
      const show = (ok) => { // success state replaces the fields; the form stays in the page for another enquiry
        form.classList.toggle('is-sent', ok); if (done) done.hidden = !ok;
        if (ok) { form.reset(); status.textContent = ''; done && done.focus(); }
      };
      if (form.elements.website.value) { show(true); return; } // honeypot: bots get the same screen, nothing is sent
      const btn = $('button[type="submit"]', form); btn.disabled = true; status.textContent = 'Sending…';
      try {
                // The form receiver is on another host, so this is a plain cross-site POST. The browser hides the reply
        // (no-cors), so a completed request counts as sent and a network failure is the only error we can see.
        await fetch(new URL('/', form.action), { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)).toString() });
        show(true);
      } catch (_) { status.textContent = 'That did not send. Please check your connection and try again.'; }
      btn.disabled = false;
    });
    const again = $('[data-again]', form); if (again) again.addEventListener('click', () => { form.classList.remove('is-sent'); done.hidden = true; form.elements.name.focus(); });
  }

  /* ── 3D scene: lazy, capability checked, paused offscreen ─ */
  const host = $('[data-scene]');
  if (host) {
    const variant = host.dataset.scene, canvas = $('canvas', host), modeBtn = $('.mode');
    const conn = navigator.connection || {};
    // creating a WebGL context is slow on some devices, so the check waits until the scene is about to start
    const webgl = () => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; } };
    const weak = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
    const use3d = !reduced && !weak && !/[?&]no3d\b/.test(location.search);
    let api = null, modeOn = false;
    const story = $('.story'), lines = $$('.story-lines span'), bar = $('.story-bar');
    const windows = variant === 'home' ? $$('.hero,.window,.interlude,.cta-final') : [host];

    const pageProgress = () => { const max = root.scrollHeight - innerHeight; return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0; };
    const flow = () => root.classList.contains('story-flow');
    const storyProgress = () => {
      if (!story) return 0; const r = story.getBoundingClientRect();
      if (flow()) return Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight)));
      const span = r.height - innerHeight; return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };
    let lastP = 0;
    const update = () => {
      const p = variant === 'home' ? pageProgress() : storyProgress();
      if (api) api.setScroll(p, p - lastP); lastP = p;
      if (variant === 'home') host.classList.toggle('is-past', scrollY > innerHeight * 0.55);
      if (story && flow()) { // each line lights as it comes into view
        let lit = 0; lines.forEach((l) => { const on = l.getBoundingClientRect().top < innerHeight * 0.84; l.classList.toggle('on', on); if (on) lit++; });
        bar && bar.style.setProperty('--p', (lit / lines.length).toFixed(4));
      } else if (story) { lines.forEach((l, i) => l.classList.toggle('on', p >= (i / lines.length) * 0.86 - 0.01)); bar && bar.style.setProperty('--p', p.toFixed(4)); }
    };
    if (story && (reduced || !('IntersectionObserver' in window))) root.classList.add('static-story');
    // The pinned layout only works if the whole story fits the screen. When it does not (small phones,
    // landscape, large text), the section switches to normal flow so nothing can overlap.
    const fitStory = () => {
      if (!story || root.classList.contains('static-story')) return;
      root.classList.remove('story-flow');
      const wrap = $('.story-pin > .wrap');
      root.classList.toggle('story-flow', wrap.scrollHeight > wrap.clientHeight + 1);
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    };
    if (story) {
      fitStory(); let ft = 0;
      addEventListener('resize', () => { clearTimeout(ft); ft = setTimeout(() => { fitStory(); update(); }, 150); });
      addEventListener('load', () => { fitStory(); update(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitStory(); update(); });
    }
    // GSAP ScrollTrigger drives the scene when it is available; plain scroll events are the fallback
    addEventListener('scroll', update, { passive: true });
    vendors.then(() => {
      if (variant === 'home') removeEventListener('scroll', update); // the story keeps its listener for the flow layout
      const trigger = variant === 'home' ? document.body : story;
      if (!trigger) return;
      window.ScrollTrigger.create({ trigger, start: 'top top', end: 'bottom bottom', onUpdate: update, onRefresh: update });
    }).catch(() => {});
    addEventListener('resize', update); update();

    // pointer and device tilt feed the camera
    if (fine) addEventListener('pointermove', (e) => api && api.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1), { passive: true });
    const onTilt = (e) => { if (api && e.gamma != null) api.setPointer(e.gamma / 28, ((e.beta || 45) - 45) / 30); };
    const listenTilt = () => addEventListener('deviceorientation', onTilt, { passive: true });
    if (!fine && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') listenTilt();

    if (modeBtn) modeBtn.addEventListener('click', () => {
      modeOn = !modeOn; modeBtn.setAttribute('aria-pressed', String(modeOn));
      $('.mode-label', modeBtn).textContent = modeOn ? 'Night circuit' : 'Showroom';
      host.classList.toggle('is-circuit', modeOn); if (api) api.setMode(modeOn);
      // iOS asks for motion access once, on this deliberate tap
      if (!fine && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && !modeBtn.dataset.asked) {
        modeBtn.dataset.asked = '1'; DeviceOrientationEvent.requestPermission().then((s) => s === 'granted' && listenTilt()).catch(() => {});
      }
    });

    if (!use3d) root.classList.add('no-3d');
    else {
      const loader = document.createElement('div'); loader.className = 'scene-loader'; loader.setAttribute('aria-hidden', 'true'); document.body.append(loader);
      const loaded = () => root.classList.remove('scene-loading');
      const boot = () => { if (!webgl()) { root.classList.add('no-3d'); return; } root.classList.add('scene-loading'); return import('/assets/js/scene.js').then(({ createScene }) => createScene({
        canvas, variant, onReady: (ok) => { loaded(); if (ok) host.classList.add('is-live'); else root.classList.add('no-3d'); },
      })).then((a) => {
        api = a; host.__scene = a; api.setMode(modeOn); update();
        // one requestAnimationFrame for everything: GSAP's ticker drives Lenis and the 3D scene together
        vendors.then((gsap) => { if (!api) return; api.useExternalLoop(); gsap.ticker.add((time, deltaMs) => api && api.update(deltaMs / 1000)); }).catch(() => {});
        // free the GPU when leaving; pause instead if the page goes into the back/forward cache
        addEventListener('pagehide', (e) => { if (!api) return; if (e.persisted) api.setActive(false); else { api.dispose(); api = null; } });
        addEventListener('pageshow', (e) => { if (e.persisted && api) api.setActive(true); });
        const seen = new Set();
        const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target))); api.setActive(seen.size > 0); });
        windows.forEach((el) => io.observe(el));
      }).catch((err) => { loaded(); console.warn('KRELVO: 3D scene unavailable, showing poster.', err); root.classList.add('no-3d'); }); };
      // The scene is heavy, so it never competes with first paint: it starts on the visitor's
      // first interaction, or shortly after load on desktop pointers. Until then the poster shows.
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
      const wake = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'scroll', 'wheel'];
      let booted = false;
      const go = () => { if (booted) return; booted = true; wake.forEach((ev) => removeEventListener(ev, go)); idle(boot); };
      wake.forEach((ev) => addEventListener(ev, go, { passive: true, once: true }));
      if (fine) { const later = () => setTimeout(go, 3500); if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true }); }
    }
  }
})();
