/* Socle commun : état (calme, WebGL), défilement fluide, curseur, aimants, transitions. */
const { gsap, ScrollTrigger } = window;
const root = document.documentElement;

const pageLang = (document.querySelector('main[data-lang]') || {}).dataset?.lang || root.lang || 'fr';
export const env = {
  lang: pageLang.startsWith('en') ? 'en' : 'fr',
  calm: false,
  webgl: false,
  touch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
  desktop: () => window.matchMedia('(min-width: 1024px)').matches,
  lenis: null,
};
/* typographie française : espaces insécables avant : ; ! ? et dans les guillemets */
const frTypo = (s) => (typeof s === 'string' ? s.replace(/ ([;!?])/g, '\u202f$1').replace(/ :/g, '\u00a0:').replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»') : s);
export const t = (fr, en) => (env.lang === 'en' ? en : frTypo(fr));
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const fmt = (n) => new Intl.NumberFormat(env.lang === 'en' ? 'en-GB' : 'fr-FR').format(n);

function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
function sGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function sSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
function sDel(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

export function detect() {
  root.classList.remove('no-js'); root.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stored = safeGet('icc-calm');
  env.calm = stored === '1' || (stored === null && reduce);
  // ?calme dans l'adresse active le mode calme, sauf si le visiteur a déjà fait un choix
  if (stored === null && new URLSearchParams(location.search).has('calme')) env.calm = true;
  root.classList.toggle('calm', env.calm);
  let gl = null;
  if (!new URLSearchParams(location.search).has('nowebgl')) {
    try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { gl = null; }
  }
  env.webgl = !!gl;
  root.classList.toggle('no-webgl', !env.webgl);
  if (!env.desktop()) root.classList.add('is-mobile');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // rechargement ou retour arrière : on mémorise la section visible pour y revenir (scrollRestoration manuel)
  window.addEventListener('pagehide', () => {
    const secs = [...document.querySelectorAll('main section[id]')]; const mid = window.innerHeight * 0.35; let best = null;
    secs.forEach((x) => { const r = x.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = x.id; });
    if (best && window.scrollY > 0) sSet('icc-pos', location.pathname + '#' + best);
  });
}

/* Redimensionnement : regroupé, et sans réagir à la barre d'adresse des téléphones (hauteur seule) */
const resizeFns = new Set();
let lastW = window.innerWidth, lastH = window.innerHeight, resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const w = window.innerWidth, h = window.innerHeight;
    const widthChanged = w !== lastW;
    if (!widthChanged && env.touch) return;
    if (!widthChanged && Math.abs(h - lastH) < 2) return;
    lastW = w; lastH = h;
    resizeFns.forEach((fn) => fn());
  }, 150);
});
export function onResize(fn) { resizeFns.add(fn); }

/* Passage ordinateur ↔ tablette : les sections épinglées changent de nature, on recharge proprement */
export function breakpointWatch() {
  const mq = window.matchMedia('(min-width: 1024px)');
  const start = mq.matches;
  mq.addEventListener('change', () => {
    if (mq.matches === start) return;
    // pas de rechargement si un formulaire a été rempli : la saisie serait perdue
    const saisie = [...document.querySelectorAll('input, textarea, select')].some((c) => (c.type === 'checkbox' || c.type === 'radio') ? c.checked !== c.defaultChecked : c.value !== c.defaultValue);
    if (saisie) { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); return; }
    rememberPosition();
    location.reload();
  });
}

/* Garde la section visible quand la page se recharge (mode calme, changement de format) */
function rememberPosition() {
  const secs = [...document.querySelectorAll('main section[id]')];
  const mid = window.innerHeight * 0.35;
  let best = null;
  secs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) best = s.id; });
  if (best) sSet('icc-section', best);
}
export const hasPendingJump = () => !!(sGet('icc-section') || (sGet('icc-pos') || '').split('#')[0] === location.pathname || (location.hash && location.hash.length > 1 && location.hash !== '#top'));
export function restorePosition() {
  // rechargement ou retour arrière sur la même page : on revient à la section mémorisée
  const pos = sGet('icc-pos'); if (pos) sDel('icc-pos');
  const nav = performance.getEntriesByType?.('navigation')[0];
  if (pos && nav && (nav.type === 'reload' || nav.type === 'back_forward') && !location.hash && pos.split('#')[0] === location.pathname) {
    const el = document.getElementById(pos.split('#')[1]); if (el) { jumpTo(el); return true; }
  }
  const id = sGet('icc-section');
  if (id) { sDel('icc-section'); const el = document.getElementById(id); if (el) { jumpTo(el); return true; } }
  if (location.hash && location.hash.length > 1) {
    let el = null;
    try { el = document.querySelector(location.hash); } catch (e) { el = null; }
    if (el) { jumpTo(el); return true; }
  }
  return false;
}
function jumpTo(el) {
  const y = el.getBoundingClientRect().top + window.scrollY - 8;
  if (env.lenis) env.lenis.scrollTo(y, { immediate: true, force: true });
  window.scrollTo(0, y);
}

export function calmToggle() {
  document.querySelectorAll('[data-calm-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', env.calm ? 'true' : 'false');
    b.addEventListener('click', () => {
      safeSet('icc-calm', env.calm ? '0' : '1');
      rememberPosition();
      location.reload();
    });
  });
  // retour arrière (cache du navigateur) : resynchronise si le mode a changé sur une autre page
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const s = safeGet('icc-calm');
    if (s !== null && (s === '1') !== env.calm) location.reload();
  });
}

export function smoothScroll() {
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  if (window.Flip) gsap.registerPlugin(window.Flip);
  if (window.ScrambleTextPlugin) gsap.registerPlugin(window.ScrambleTextPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (env.calm || !window.Lenis) return;
  const lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.2 });
  env.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const headerH = () => (document.querySelector('.header')?.offsetHeight || 76);
export function scrollToTarget(target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el) return;
  // en remontant, l'en-tête réapparaît : on laisse sa place
  const up = el.getBoundingClientRect().top < 0;
  const offset = up ? -headerH() : -8;
  if (env.lenis) env.lenis.scrollTo(el, { offset, duration: 1.4 });
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: env.calm ? 'auto' : 'smooth' });
}
function toTop() {
  if (env.lenis) env.lenis.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: env.calm ? 'auto' : 'smooth' });
}

export function anchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    if (id === '#top') {
      e.preventDefault(); closeMenu(); toTop();
      const skip = document.querySelector('.brand'); if (skip) skip.focus({ preventScroll: true });
      return;
    }
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(el);
    history.replaceState(null, '', id);
    const focusTarget = el.matches('[tabindex]') ? el : el.querySelector('h1, h2, h3');
    if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  });
}

/* En-tête : se masque en descendant, revient en remontant */
export function header() {
  const h = document.querySelector('.header');
  if (!h) return;
  let last = 0;
  const onScroll = () => {
    const y = window.scrollY;
    h.classList.toggle('is-solid', y > 30);
    const down = y > last && y > 240;
    if (!document.body.classList.contains('menu-open')) h.classList.toggle('is-hidden', down);
    last = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  h.addEventListener('focusin', () => h.classList.remove('is-hidden'));
}

let menuEl, burger;
export function closeMenu(returnFocus = false) {
  if (!menuEl || !menuEl.classList.contains('is-open')) return;
  menuEl.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', burger.dataset.labelOpen);
  menuEl.setAttribute('aria-hidden', 'true');
  menuEl.inert = true;
  if (env.lenis) env.lenis.start();
  if (returnFocus) burger.focus();
}
export function menu() {
  menuEl = document.getElementById('menu'); burger = document.querySelector('.burger');
  if (!menuEl || !burger) return;
  menuEl.inert = true;
  burger.addEventListener('click', () => {
    const open = !menuEl.classList.contains('is-open');
    if (!open) return closeMenu(true);
    menuEl.classList.add('is-open');
    menuEl.inert = false;
    menuEl.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', burger.dataset.labelClose);
    if (env.lenis) env.lenis.stop();
    const first = menuEl.querySelector('a'); if (first) setTimeout(() => first.focus(), 300);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuEl.classList.contains('is-open')) { closeMenu(true); return; }
    // le focus reste dans le menu ouvert (bouton de fermeture compris)
    if (e.key === 'Tab' && menuEl.classList.contains('is-open')) {
      const items = [burger, ...menuEl.querySelectorAll('a, button')];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
  window.addEventListener('pagehide', () => closeMenu());
}

/* Curseur personnalisé */
export function cursor() {
  if (env.touch) return;
  const ring = document.createElement('div'); ring.className = 'cursor'; ring.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span'); ring.appendChild(label);
  const dot = document.createElement('div'); dot.className = 'cursor-dot'; dot.setAttribute('aria-hidden', 'true');
  document.body.append(ring, dot);
  const rx = gsap.quickTo(ring, 'x', { duration: env.calm ? 0.01 : 0.5, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: env.calm ? 0.01 : 0.5, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    root.classList.add('has-cursor');
    rx(e.clientX); ry(e.clientY);
    gsap.set(dot, { x: e.clientX, y: e.clientY });
  }, { passive: true });
  document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-cursor]');
    if (el) { label.textContent = el.dataset.cursor; ring.classList.add('is-big'); }
  });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest('[data-cursor]');
    if (el && !el.contains(e.relatedTarget)) ring.classList.remove('is-big');
  });
}

/* Boutons magnétiques */
export function magnetic() {
  if (env.touch || env.calm) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const strength = +(el.dataset.magnetic || 0.35);
    const label = el.querySelector('.btn__label');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const lx = label ? gsap.quickTo(label, 'x', { duration: 0.4, ease: 'power3' }) : null;
    const ly = label ? gsap.quickTo(label, 'y', { duration: 0.4, ease: 'power3' }) : null;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2); const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * strength); yTo(dy * strength);
      if (lx) { lx(dx * strength * 0.4); ly(dy * strength * 0.4); }
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); if (lx) { lx(0); ly(0); } });
  });
}

/* Inclinaison 3D */
export function tilt(scope = document) {
  if (env.touch || env.calm || !scope) return;
  scope.querySelectorAll('[data-tilt]').forEach((el) => {
    if (el.dataset.tiltReady) return;
    el.dataset.tiltReady = '1';
    const max = +(el.dataset.tilt || 8);
    const rX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const rY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(el, { transformPerspective: 1100 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; const py = (e.clientY - r.top) / r.height - 0.5;
      rY(px * max); rX(-py * max);
    });
    el.addEventListener('pointerleave', () => { rX(0); rY(0); });
  });
}

/* Titres révélés ligne à ligne */
export function splitReveals(scope = document) {
  if (env.calm || !window.SplitText) return;
  scope.querySelectorAll('[data-split]').forEach((el) => {
    el.classList.add('split-lines');
    window.SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, aria: 'none',
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      },
    });
  });
  scope.querySelectorAll('[data-fade]').forEach((el) => {
    gsap.from(el, { opacity: 0, y: 28, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
}

/* Compteurs (le HTML porte déjà la valeur finale : rien de faux si le script ne tourne pas) */
export function counters(scope = document) {
  scope.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count; const suffix = el.dataset.suffix || ''; const prefix = el.dataset.prefix || '';
    const write = (v) => { el.textContent = prefix + fmt(Math.round(v)) + suffix; };
    if (env.calm) { write(end); return; }
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: +(el.dataset.dur || 1.8), ease: 'power3.out', immediateRender: false, onStart: () => write(0), onUpdate: () => write(o.v), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
}

/* Accent jaune → turquoise selon la progression (Spirale Dynamique), par paliers pour ménager le rendu */
const GOLD = [242, 193, 78], TURQ = [46, 196, 182];
export const accent = { rgb: GOLD.slice(), listeners: [] };
export function accentScroll() {
  let step = -1;
  const apply = (p) => {
    const s = Math.round(clamp(p) * 32);
    if (s === step) return;
    step = s;
    const k = s / 32;
    const c = GOLD.map((g, i) => Math.round(lerp(g, TURQ[i], k)));
    accent.rgb = c;
    root.style.setProperty('--accent', `rgb(${c[0]} ${c[1]} ${c[2]})`);
    root.style.setProperty('--accent-rgb', `${c[0]} ${c[1]} ${c[2]}`);
    accent.listeners.forEach((fn) => fn(c));
  };
  apply(0);
  ScrollTrigger.create({ trigger: document.body, start: 'top top', end: 'max', refreshPriority: -20, onUpdate: (s) => apply(s.progress) });
}

/* Transition de page : rideau de points */
export function veil() {
  const v = document.createElement('div'); v.className = 'veil'; v.setAttribute('aria-hidden', 'true');
  const c = document.createElement('canvas'); v.appendChild(c); document.body.appendChild(v);
  const ctx = c.getContext('2d');
  let W, H, dpr;
  const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size(); onResize(size);
  const draw = (p, ox, oy, inward) => {
    ctx.clearRect(0, 0, W, H);
    if (p <= 0) return;
    const step = 26; const maxD = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    for (let y = step / 2; y < H + step; y += step) {
      for (let x = step / 2; x < W + step; x += step) {
        const d = Math.hypot(x - ox, y - oy) / maxD;
        const local = clamp((p * 1.6 - (inward ? 1 - d : d) * 0.6));
        if (local <= 0) continue;
        const r = local * step * 0.78;
        ctx.fillStyle = local > 0.98 ? '#06111D' : `rgba(6,17,29,${0.4 + local * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (local < 0.9 && local > 0.2) { ctx.fillStyle = `rgba(${accent.rgb.join(',')},${(1 - local) * 0.8})`; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); }
      }
    }
  };
  const arriving = sGet('icc-veil');
  if (arriving && !env.calm) {
    sDel('icc-veil');
    const [ox, oy] = arriving.split(',').map(Number);
    const o = { p: 1 }; draw(1, W / 2, H / 2, false);
    gsap.to(o, { p: 0, duration: 0.9, ease: 'power2.inOut', delay: 0.05, onUpdate: () => draw(o.p, ox || W / 2, oy || H / 2, true), onComplete: () => ctx.clearRect(0, 0, W, H) });
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) ctx.clearRect(0, 0, W, H); });
  if (env.calm) return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (!/\.html$|\/$/.test(url.pathname) && /\.[a-z0-9]+$/i.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    const ox = e.clientX || W / 2, oy = e.clientY || H / 2;
    sSet('icc-veil', `${ox},${oy}`);
    const o = { p: 0 };
    gsap.to(o, { p: 1, duration: 0.7, ease: 'power2.in', onUpdate: () => draw(o.p, ox, oy, false), onComplete: () => { location.href = url.href; } });
  });
}

export function yearStamp() {
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

/* Exécute fn quand l'élément approche de l'écran (une fois) */
export function whenNear(el, fn, margin = '300px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: margin });
  io.observe(el);
}

/* Suivi de visibilité pour suspendre les canvas hors écran */
export function visibility(el, cb) {
  if (!el || !('IntersectionObserver' in window)) { cb(true); return; }
  new IntersectionObserver((entries) => entries.forEach((en) => cb(en.isIntersecting)), { rootMargin: '120px' }).observe(el);
}
