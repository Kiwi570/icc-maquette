/* Junior Impact Maker : héros en masque, formules, frise juin → août, outils, alternance, travaux, candidature */
import { env, t, clamp, tilt, counters, onResize } from './core.js?v=20261028';
import { mountSky } from './constellation.js?v=20261028';
import { countdowns } from './sessions.js?v=20261028';
import { marquees } from './visuals.js?v=20261028';
import { wizards } from './wizard.js?v=20261028';

const { gsap, ScrollTrigger } = window;

function hero() {
  const h = document.querySelector('.hero--jim');
  if (!h) return;
  const media = h.querySelector('.hero__media');
  const lines = h.querySelectorAll('.hero__title .line');
  const rest = h.querySelectorAll('[data-hero-in]');
  if (env.calm) return;
  gsap.set(lines, { yPercent: 60, opacity: 0 }); gsap.set(rest, { opacity: 0, y: 20 });
  document.documentElement.classList.remove('hero-pending');
  const tl = gsap.timeline({ delay: 0.1 });
  tl.fromTo(media, { '--inset': '18%', '--radius': '28px' }, { '--inset': '0%', '--radius': '0px', duration: 1.8, ease: 'expo.inOut' }, 0)
    .fromTo(media.querySelector('img'), { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0)
    .to(lines, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 0.7)
    .to(rest, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 1.0);
  gsap.to(media, { '--inset': '4%', '--radius': '24px', ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
}

function vision() {
  const a = document.querySelector('.vision__media .media--a img');
  const b = document.querySelector('.vision__media .media--b');
  if (!a || env.calm) return;
  gsap.fromTo(a, { yPercent: -8, scale: 1.15 }, { yPercent: 8, scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.vision', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo(b, { yPercent: 30 }, { yPercent: -20, ease: 'none', scrollTrigger: { trigger: '.vision', start: 'top bottom', end: 'bottom top', scrub: true } });
}

function plans() {
  const sec = document.querySelector('#formules');
  if (!sec) return;
  const cards = [...sec.querySelectorAll('.plan')];
  const who = [...sec.querySelectorAll('.who .filter')];
  tilt(sec);
  who.forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    who.forEach((x) => x.setAttribute('aria-pressed', x === b && on ? 'true' : 'false'));
    const keys = on ? b.dataset.match.split(' ') : [];
    cards.forEach((c) => {
      const m = keys.includes(c.dataset.plan);
      c.classList.toggle('is-match', m);
      c.classList.toggle('is-dim', keys.length > 0 && !m);
    });
    const live = sec.querySelector('[data-live]');
    if (live) live.textContent = keys.length ? t('Formule conseillée mise en avant', 'Recommended track highlighted') : '';
  }));
  if (!env.calm) gsap.from(cards, { y: 60, opacity: 0, stagger: 0.12, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: sec.querySelector('.plans'), start: 'top 85%', once: true } });
}

function timeline() {
  const sec = document.querySelector('#deroule');
  if (!sec) return;
  const track = sec.querySelector('.timeline__track');
  const bars = [...sec.querySelectorAll('.month__bar i')];
  if (env.calm) return;
  if (!env.desktop()) {
    sec.classList.add('no-pin');
    bars.forEach((b) => gsap.to(b, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: b, start: 'top 90%', end: 'top 50%', scrub: true } }));
    return;
  }
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const tw = gsap.to(track, { x: () => -dist(), ease: 'none' });
  ScrollTrigger.create({ trigger: sec, start: 'top top', end: () => `+=${dist() + window.innerHeight * 0.6}`, pin: sec.querySelector('.timeline__stage'), scrub: 0.8, animation: tw, invalidateOnRefresh: true,
    onUpdate: (s) => { const p = s.progress * bars.length; bars.forEach((b, i) => gsap.set(b, { scaleX: clamp(p - i) })); } });
}

function tools() {
  const items = [...document.querySelectorAll('.tools__list li')];
  if (!items.length) return;
  if (env.calm) { items.forEach((li) => li.classList.add('is-on')); return; }
  ScrollTrigger.create({ trigger: '.tools__list', start: 'top 75%', end: 'bottom 45%', scrub: true, onUpdate: (s) => items.forEach((li, i) => li.classList.toggle('is-on', s.progress * items.length > i + 0.2)) });
}

function steps() {
  const box = document.querySelector('.steps');
  if (!box) return;
  const line = box.querySelector('.steps__line i');
  const st = [...box.querySelectorAll('.stepx')];
  if (env.calm) { gsap.set(line, { scaleY: 1 }); st.forEach((s) => s.classList.add('is-on')); return; }
  ScrollTrigger.create({ trigger: box, start: 'top 70%', end: 'bottom 60%', scrub: 0.4, onUpdate: (s) => { gsap.set(line, { scaleY: s.progress }); st.forEach((el, i) => el.classList.toggle('is-on', s.progress >= i / st.length)); } });
}

/* Couvertures génératives : une constellation unique par titre */
function covers() {
  const redraws = [];
  document.querySelectorAll('.work__cover canvas').forEach((c) => {
    const title = c.dataset.title || '';
    let h = 2166136261; for (let i = 0; i < title.length; i++) { h ^= title.charCodeAt(i); h = Math.imul(h, 16777619); }
    let s = (h >>> 0) % 2147483646 + 1; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1); const W = c.clientWidth, H = c.clientHeight;
      if (!W) return;
      c.width = W * dpr; c.height = H * dpr; const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s = (h >>> 0) % 2147483646 + 1;
      const hue = r();
      const g = ctx.createLinearGradient(0, 0, W, H);
      const top = hue < 0.33 ? [16, 42, 64] : hue < 0.66 ? [12, 48, 52] : [34, 32, 54];
      g.addColorStop(0, `rgb(${top.join(',')})`); g.addColorStop(1, '#06111D');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const n = 7 + Math.floor(r() * 7); const pts = [];
      for (let i = 0; i < n; i++) pts.push([W * (0.12 + r() * 0.76), H * (0.1 + r() * 0.5)]);
      ctx.strokeStyle = r() > 0.5 ? 'rgba(46,196,182,.7)' : 'rgba(242,193,78,.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(232,238,242,${0.15 + r() * 0.5})`; ctx.beginPath(); ctx.arc(r() * W, r() * H * 0.75, r() * 1.1, 0, 7); ctx.fill(); }
      pts.forEach(([x, y]) => { ctx.fillStyle = '#E8EEF2'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); });
    };
    draw();
    let lastW = c.clientWidth;
    redraws.push(() => { if (c.clientWidth !== lastW) { lastW = c.clientWidth; draw(); } });
  });
  onResize(() => redraws.forEach((f) => f()));
  tilt(document.querySelector('.works__grid') || document);
}

export function initJim() {
  mountSky({ intro: false, until: document.querySelector('.hero--jim') });
  hero();
  vision();
  plans();
  timeline();
  tools();
  steps();
  covers();
  countdowns();
  marquees();
  counters();
  wizards();
  const q = document.querySelector('.quote blockquote');
  if (q && !env.calm && window.SplitText) window.SplitText.create(q, { type: 'lines', mask: 'lines', linesClass: 'ln', aria: 'none', autoSplit: true, onSplit: (self) => gsap.from(self.lines, { yPercent: 105, stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: q, start: 'top 80%', once: true } }) });
}
