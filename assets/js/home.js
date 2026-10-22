/* Accueil : ouverture, manifeste, architecture en 6 niveaux, métiers, catalogue, carte, équipe, contact */
import { env, t, clamp, scrollToTarget, tilt, counters, onResize, hasPendingJump } from './core.js';
import { mountSky } from './constellation.js';
import { renderSessions, countdowns } from './sessions.js';
import { marquees, seed, worldMap } from './visuals.js';
import { wizards } from './wizard.js';

const { gsap, ScrollTrigger } = window;

function heroReveal() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const lines = hero.querySelectorAll('.hero__title .line');
  const rest = hero.querySelectorAll('[data-hero-in]');
  if (env.calm) return;
  gsap.set(lines, { yPercent: 110, opacity: 0 });
  gsap.set(rest, { opacity: 0, y: 24 });
  gsap.set(hero.querySelector('.hero__media'), { opacity: 0, scale: 1.08 });
  document.documentElement.classList.remove('hero-pending');
  return () => {
    const tl = gsap.timeline();
    tl.to(hero.querySelector('.hero__media'), { opacity: 1, scale: 1, duration: 2.2, ease: 'power2.out' }, 0)
      .to(lines, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.1)
      .to(rest, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.45);
    // parallaxe du fond
    gsap.to(hero.querySelector('.hero__media'), { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  };
}

function intro() {
  const reveal = heroReveal();
  const root = document.documentElement;
  const skip = document.querySelector('.intro-skip');
  let done = false;
  const finish = () => { if (done) return; done = true; root.classList.remove('is-intro'); if (reveal) reveal(); if (env.lenis) env.lenis.start(); };
  const firstVisit = (() => { try { return !sessionStorage.getItem('icc-intro'); } catch (e) { return true; } })();
  const atTop = window.scrollY < 40 && !hasPendingJump();
  const playIntro = !env.calm && env.webgl && firstVisit && atTop;
  if (playIntro) {
    root.classList.add('is-intro');
    if (env.lenis) env.lenis.stop();
    try { sessionStorage.setItem('icc-intro', '1'); } catch (e) { /* ignore */ }
  }
  const sky = mountSky({ intro: playIntro, onReveal: finish, until: document.querySelector('#architecture') });
  if (skip) skip.addEventListener('click', finish);
  // l'introduction cède dès que le visiteur veut agir (molette, toucher, clavier)
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (playIntro) finish(); }, { once: true, passive: true, capture: true }));
  if (!playIntro) finish();
  return sky;
}

function manifesto() {
  const sec = document.querySelector('#manifeste');
  if (!sec) return;
  const big = sec.querySelector('.manifesto__big');
  const svg = sec.querySelector('.manifesto__threads');
  const media = sec.querySelector('.manifesto__media');
  if (env.calm) { big.querySelectorAll('.word').forEach((w) => w.classList.add('is-on')); return; }
  const words = [...big.querySelectorAll('.word')];
  let path, len = 0, dots = [];
  const layout = () => {
    const box = big.getBoundingClientRect();
    const pts = words.map((w) => { const r = w.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height * 0.18]; });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    let d = '';
    pts.forEach(([x, y], i) => {
      if (i === 0) { d += `M${x},${y}`; return; }
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2, cy = Math.min(py, y) - 28;
      d += ` Q${cx},${cy} ${x},${y}`;
    });
    svg.innerHTML = `<path d="${d}"/>` + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" opacity="0"/>`).join('');
    path = svg.querySelector('path'); dots = [...svg.querySelectorAll('circle')];
    len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    update(state.p);
  };
  const state = { p: 0 };
  const update = (p) => {
    state.p = p;
    const k = p * words.length;
    words.forEach((w, i) => w.classList.toggle('is-on', k > i + 0.2));
    dots.forEach((c, i) => c.setAttribute('opacity', k > i + 0.2 ? '1' : '0'));
    if (path) path.style.strokeDashoffset = `${len * (1 - clamp((k - 0.2) / Math.max(1, words.length - 1)))}`;
  };
  layout();
  onResize(() => requestAnimationFrame(layout));
  document.fonts && document.fonts.ready.then(layout);
  ScrollTrigger.create({ trigger: big, start: 'top 75%', end: 'bottom 35%', scrub: 0.4, onUpdate: (s) => update(s.progress) });
  if (media) {
    gsap.fromTo(media, { clipPath: 'circle(12% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', ease: 'none', scrollTrigger: { trigger: media, start: 'top 90%', end: 'center 50%', scrub: true } });
    gsap.fromTo(media.querySelector('img'), { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
}

function architecture(sky) {
  const sec = document.querySelector('#architecture');
  if (!sec) return;
  const steps = [...sec.querySelectorAll('.arch__step')];
  const rail = [...sec.querySelectorAll('.arch__rail button')];
  const count = sec.querySelector('[data-arch-count]');
  const rings = [...sec.querySelectorAll('.arch__svg ellipse')];
  if (env.calm) return;
  let current = -1;
  const setLevel = (k) => {
    if (k === current) return;
    const prevEl = steps[current];
    current = k;
    steps.forEach((s, i) => s.classList.toggle('is-active', i === k));
    rail.forEach((b, i) => { b.classList.toggle('is-active', i === k); b.setAttribute('aria-current', i === k ? 'step' : 'false'); });
    rings.forEach((r, i) => r.classList.toggle('is-active', i === k));
    if (count) count.textContent = String(k + 1).padStart(2, '0');
    const el = steps[k];
    if (prevEl) gsap.killTweensOf(prevEl.children);
    gsap.fromTo(el.children, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 });
  };
  setLevel(0);
  const st = ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => `+=${window.innerHeight * (env.desktop() ? 4 : 3.5)}`, pin: sec.querySelector('.arch__stage'), pinSpacing: true, anticipatePin: 1,
    onUpdate: (s) => {
      const p = s.progress;
      if (sky) {
        sky.uniforms.uArch.value = clamp(p / 0.12);
        sky.uniforms.uLevel.value = clamp((p - 0.06) / 0.9) * 5.0;
        sky.uniforms.uDrift.value = 1 - sky.uniforms.uArch.value * 0.7;
      }
      setLevel(Math.min(5, Math.floor(clamp((p - 0.04) / 0.92) * 6)));
    },
    onLeave: () => { if (sky) sky.uniforms.uArch.value = 1; },
  });
  rail.forEach((b, i) => b.addEventListener('click', () => {
    const y = st.start + (st.end - st.start) * (0.06 + (i + 0.5) / 6 * 0.9);
    if (env.lenis) env.lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo({ top: y, behavior: 'smooth' });
  }));
  // sortie de la séquence : les anneaux s'effacent au lieu de rester figés sous la section suivante
  if (sky) ScrollTrigger.create({ trigger: sec, start: 'bottom 95%', end: 'bottom 40%', scrub: true, refreshPriority: -5, onUpdate: (s) => { sky.uniforms.uFade.value = 1 - s.progress; } });
  // le texte du manifeste reste lisible : on atténue le ciel
  if (sky) ScrollTrigger.create({ trigger: '#manifeste', start: 'top 60%', end: 'bottom 40%', onToggle: (s) => gsap.to(sky.uniforms.uFade, { value: s.isActive ? 0.55 : 1, duration: 0.8 }) });
}

function duo() {
  const cards = document.querySelectorAll('.duo-card');
  if (!cards.length) return;
  tilt(document.querySelector('.duo'));
  if (env.calm) return;
  const [a, b] = cards;
  if (env.desktop()) {
    gsap.fromTo(a, { xPercent: 26, rotation: -4 }, { xPercent: 0, rotation: 0, ease: 'none', scrollTrigger: { trigger: '.duo__cards', start: 'top 90%', end: 'top 30%', scrub: true } });
    gsap.fromTo(b, { xPercent: -26, rotation: 4, yPercent: 10 }, { xPercent: 0, rotation: 0, yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.duo__cards', start: 'top 90%', end: 'top 30%', scrub: true } });
  }
  // déformation liquide au survol
  const turb = document.querySelector('#liquid feTurbulence'); const disp = document.querySelector('#liquid feDisplacementMap');
  if (turb && disp && !env.touch) {
    cards.forEach((card) => {
      const img = card.querySelector('img');
      const o = { s: 0, f: 0.012 };
      const set = () => { disp.setAttribute('scale', o.s); turb.setAttribute('baseFrequency', `${o.f} ${o.f * 1.6}`); };
      card.addEventListener('pointerenter', () => { img.style.filter = 'url(#liquid)'; gsap.to(o, { s: 38, f: 0.02, duration: 0.9, ease: 'power2.out', onUpdate: set }); });
      card.addEventListener('pointerleave', () => { gsap.to(o, { s: 0, f: 0.012, duration: 0.7, ease: 'power2.inOut', onUpdate: set, onComplete: () => { img.style.filter = ''; } }); });
    });
  }
}

function catalogue() {
  const sec = document.querySelector('#formations');
  if (!sec) return;
  const track = sec.querySelector('.cat__track');
  const viewport = sec.querySelector('.cat__viewport');
  const cards = [...sec.querySelectorAll('.course')];
  const filters = [...sec.querySelectorAll('.filter')];
  const bar = sec.querySelector('.cat__progress i');
  let pinST = null;
  const foot = sec.querySelector('.cat__progress');
  const setupPin = () => {
    if (pinST) { pinST.kill(true); gsap.set(track, { x: 0 }); pinST = null; }
    sec.classList.remove('is-pinned');
    if (env.calm || !env.desktop()) return;
    // mise en page compacte pendant l'épinglage : titre, filtres et cartes entières tiennent dans l'écran
    sec.classList.add('is-pinned');
    const dist = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    if (dist() < 40) { sec.classList.remove('is-pinned'); return; }
    // si l'ensemble dépasse la hauteur de l'écran, on épingle plus bas : le bas des cartes et la barre de progression restent visibles
    const offset = () => {
      const r = sec.getBoundingClientRect();
      const bottom = (foot || track).getBoundingClientRect().bottom - r.top + 18;
      return Math.max(0, Math.round(bottom - window.innerHeight));
    };
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none' });
    pinST = ScrollTrigger.create({ trigger: sec, start: () => `top+=${offset()} top`, end: () => `+=${dist()}`, pin: true, scrub: 0.8, animation: tw, invalidateOnRefresh: true, onUpdate: (s) => bar && gsap.set(bar, { scaleX: s.progress }) });
  };
  setupPin();
  if (!env.desktop() && bar) viewport.addEventListener('scroll', () => { const m = viewport.scrollWidth - viewport.clientWidth; gsap.set(bar, { scaleX: m > 0 ? viewport.scrollLeft / m : 0 }); }, { passive: true });
  filters.forEach((f) => f.addEventListener('click', () => {
    filters.forEach((x) => x.setAttribute('aria-pressed', x === f ? 'true' : 'false'));
    const key = f.dataset.filter;
    const state = window.Flip && !env.calm ? window.Flip.getState(cards) : null;
    cards.forEach((c) => c.classList.toggle('is-hidden', key !== 'all' && !c.dataset.tags.split(' ').includes(key)));
    const live = sec.querySelector('[data-live]');
    if (live) live.textContent = t(`${cards.filter((c) => !c.classList.contains('is-hidden')).length} formations affichées`, `${cards.filter((c) => !c.classList.contains('is-hidden')).length} programmes shown`);
    if (state) window.Flip.from(state, { duration: 0.7, ease: 'power3.inOut', absolute: true, onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.6 }), onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.4 }), onComplete: () => { setupPin(); ScrollTrigger.refresh(); } });
    else { setupPin(); ScrollTrigger.refresh(); }
  }));
  // clavier : une carte qui reçoit le focus est amenée à l'écran dans la galerie épinglée
  track.addEventListener('focusin', (e) => {
    if (!pinST) return;
    const card = e.target.closest('.course');
    if (!card) return;
    const dist = Math.max(1, track.scrollWidth - viewport.clientWidth);
    const p = clamp((card.offsetLeft - 40) / dist);
    const y = pinST.start + (pinST.end - pinST.start) * p;
    if (env.lenis) env.lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
  });
}

function quote() {
  const q = document.querySelector('.quote blockquote');
  if (!q || env.calm || !window.SplitText) return;
  window.SplitText.create(q, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, aria: 'none', onSplit: (self) => gsap.from(self.lines, { yPercent: 105, opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q, start: 'top 80%', once: true } }) });
}

function team() {
  const grid = document.querySelector('.team__grid');
  if (!grid) return;
  const svg = grid.querySelector('.team__lines');
  const members = [...grid.querySelectorAll('.member')];
  const draw = () => {
    const box = grid.getBoundingClientRect();
    const pts = members.map((m) => { const r = m.querySelector('.member__node').getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    // une seule ligne qui relie les membres de gauche à droite, en arcs doux au-dessus des portraits
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      d += ` Q${(x1 + x2) / 2},${Math.min(y1, y2) - 46} ${x2},${y2}`;
    }
    svg.innerHTML = `<path d="${d}"/>`;
    const p = svg.querySelector('path'); const L = p.getTotalLength();
    p.style.strokeDasharray = L; p.style.strokeDashoffset = env.calm ? 0 : L;
    return p;
  };
  let path = draw();
  onResize(() => { path = draw(); });
  tilt(grid);
  if (env.calm) return;
  ScrollTrigger.create({ trigger: grid, start: 'top 80%', end: 'bottom 60%', scrub: 0.6, onUpdate: (s) => { if (path) path.style.strokeDashoffset = path.getTotalLength() * (1 - s.progress); } });
  gsap.from(members, { opacity: 0, y: 50, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
}

function profiles() {
  document.querySelectorAll('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
    const f = a.dataset.filter;
    if (f) { const b = document.querySelector(`.filter[data-filter="${f}"]`); if (b) setTimeout(() => b.click(), 50); }
    if (a.getAttribute('href').startsWith('#')) return;
    e.preventDefault(); scrollToTarget(a.dataset.goto);
  }));
}

export function initHome() {
  const sky = intro();
  manifesto();
  architecture(sky);
  duo();
  catalogue();
  renderSessions(); countdowns();
  worldMap(document.querySelector('.map canvas'), document.querySelector('.map'));
  counters();
  quote();
  marquees();
  team();
  seed(document.querySelector('.contact__seed'), document.querySelector('.contact'));
  wizards();
  profiles();
}
