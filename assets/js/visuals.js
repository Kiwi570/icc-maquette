/* Visuels partagés : défilement des logos, graine qui devient réseau, carte Jura – Léman – Manhattan. */
import { env, t, clamp, accent, fmt, visibility, onResize } from './core.js?v=20261028';
import { LAND } from './data/land.js?v=20261028';

const { gsap, ScrollTrigger } = window;

/* ---------- Défilement infini des logos, avec pause ---------- */
export function marquees(scope = document) {
  scope.querySelectorAll('[data-marquee]').forEach((wrap) => {
    const rows = [...wrap.querySelectorAll('.marquee__track')];
    const btn = wrap.parentElement.querySelector('[data-marquee-toggle]');
    if (env.calm) { if (btn) btn.hidden = true; return; }
    const tweens = rows.map((track, k) => {
      track.innerHTML += track.innerHTML;
      track.querySelectorAll('.logo-tile').forEach((el, i, all) => { if (i >= all.length / 2) el.setAttribute('aria-hidden', 'true'); });
      const dir = k % 2 ? 1 : -1;
      const tw = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: 46 + k * 8, ease: 'none', repeat: -1 });
      track.addEventListener('pointerenter', () => gsap.to(tw, { timeScale: 0.15, duration: 0.6 }));
      track.addEventListener('pointerleave', () => gsap.to(tw, { timeScale: 1, duration: 0.6 }));
      return tw;
    });
    if (btn) {
      btn.addEventListener('click', () => {
        const paused = btn.getAttribute('aria-pressed') === 'true';
        tweens.forEach((tw) => (paused ? tw.play() : tw.pause()));
        btn.setAttribute('aria-pressed', paused ? 'false' : 'true');
        btn.querySelector('.btn__label').textContent = paused ? btn.dataset.pause : btn.dataset.play;
      });
    }
  });
}

/* ---------- La graine : un réseau ramifié qui pousse au défilement ---------- */
export function seed(canvas, section) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, dpr, segs = [], maxOrder = 1;
  let rs = 11;
  const r = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
  const build = () => {
    segs = []; rs = 11;
    const d = env.desktop();
    const ox = d ? W * 0.72 : W * 0.5, oy = H * 0.98;
    const grow = (x, y, ang, len, depth, order) => {
      if (depth === 0 || len < 5) return;
      const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
      segs.push({ x, y, nx, ny, depth, order });
      maxOrder = Math.max(maxOrder, order);
      const n = depth > 6 ? 2 : (r() < 0.7 ? 2 : 3);
      for (let k = 0; k < n; k++) grow(nx, ny, ang + (r() - 0.5) * 1.05 + (k - (n - 1) / 2) * 0.32, len * (0.7 + r() * 0.14), depth - 1, order + 1);
    };
    const trunk = Math.min(W, H) * (d ? 0.2 : 0.16);
    grow(ox, oy, -Math.PI / 2, trunk, d ? 10 : 9, 0);
  };
  const size = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(); draw(state.p);
  };
  const state = { p: env.calm ? 1 : 0 };
  const draw = (p) => {
    ctx.clearRect(0, 0, W, H);
    const c = accent.rgb;
    const lim = p * (maxOrder + 1);
    ctx.lineCap = 'round';
    for (const s of segs) {
      const local = clamp(lim - s.order);
      if (local <= 0) continue;
      const ex = s.x + (s.nx - s.x) * local, ey = s.y + (s.ny - s.y) * local;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 + 0.5 * (s.depth / 10)})`;
      ctx.lineWidth = Math.max(0.6, s.depth * 0.42);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ex, ey); ctx.stroke();
      if (s.depth <= 2 && local >= 1) {
        ctx.fillStyle = 'rgba(242,193,78,.95)';
        ctx.beginPath(); ctx.arc(s.nx, s.ny, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(242,193,78,.18)';
        ctx.beginPath(); ctx.arc(s.nx, s.ny, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  };
  size();
  onResize(size);
  let seen = false;
  visibility(canvas, (v) => { seen = v; });
  accent.listeners.push(() => { if (seen) draw(state.p); });
  if (env.calm) return;
  gsap.to(state, { p: 1, ease: 'none', onUpdate: () => draw(state.p), scrollTrigger: { trigger: section, start: 'top 75%', end: 'center 45%', scrub: 0.6 } });
}

/* ---------- Carte en points avec arcs ---------- */
const PLACES = [
  { id: 'ruffey', lat: 46.7366, lon: 5.4998 },
  { id: 'montreux', lat: 46.4312, lon: 6.9107 },
  { id: 'ny', lat: 40.7489, lon: -73.9680 },
];
export function worldMap(canvas, section) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dots = [];
  LAND.rle.forEach((runs, row) => runs.forEach(([s, n]) => { for (let c = s; c < s + n; c++) dots.push([LAND.lon0 + c * LAND.step, LAND.lat1 - row * LAND.step]); }));
  const lonMin = LAND.lon0, lonMax = LAND.lon0 + (LAND.cols - 1) * LAND.step, latMax = LAND.lat1, latMin = LAND.lat1 - (LAND.rows - 1) * LAND.step;
  const land = document.createElement('canvas');
  const lctx = land.getContext('2d');
  const labels = (canvas.dataset.labels || '').split('|');
  let W = 0, H = 0, dpr = 1, sx = 1, sy = 1, ox = 0, oy = 0;
  const proj = (lon, lat) => [ox + (lon - lonMin) * sx, oy + (latMax - lat) * sy];
  const st = { p: env.calm ? 1 : 0, t: 0 };
  const P = PLACES.map((p) => ({ ...p }));
  const arcs = [[0, 2], [1, 2], [0, 1]];
  const arcPoint = (a, b, u, lift) => {
    const [x1, y1] = proj(a.lon, a.lat), [x2, y2] = proj(b.lon, b.lat);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - lift;
    return [(1 - u) ** 2 * x1 + 2 * (1 - u) * u * mx + u * u * x2, (1 - u) ** 2 * y1 + 2 * (1 - u) * u * my + u * u * y2];
  };
  /* les continents ne changent pas : dessinés une fois par taille dans un calque */
  const paintLand = () => {
    land.width = canvas.width; land.height = canvas.height;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, W, H);
    const dr = Math.max(0.9, sx * 0.24);
    lctx.fillStyle = 'rgba(143,160,179,.34)';
    lctx.beginPath();
    for (const [lon, lat] of dots) { const [x, y] = proj(lon, lat); lctx.moveTo(x + dr, y); lctx.arc(x, y, dr, 0, Math.PI * 2); }
    lctx.fill();
  };
  const draw = () => {
    if (!W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(land, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = accent.rgb;
    arcs.forEach(([i, j], k) => {
      const a = P[i], b = P[j];
      const [ax, ay] = proj(a.lon, a.lat), [bx, by] = proj(b.lon, b.lat);
      const lift = Math.hypot(ax - bx, ay - by) * 0.35 + 10;
      const local = clamp(st.p * 1.6 - k * 0.3);
      if (local <= 0) return;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},.85)`; ctx.lineWidth = 1.5;
      ctx.beginPath();
      const steps = Math.max(2, Math.ceil(local * 80));
      for (let n = 0; n <= steps; n++) { const [x, y] = arcPoint(a, b, (n / steps) * local, lift); if (n === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.stroke();
      if (local >= 1 && !env.calm && k < 2) {
        const u = (st.t * 0.22 + k * 0.5) % 1;
        const [x, y] = arcPoint(a, b, u, lift);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, 'rgba(242,193,78,.95)'); g.addColorStop(1, 'rgba(242,193,78,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
    });
    const small = W < 520;
    ctx.font = `600 ${small ? 10 : 12}px Manrope, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    P.forEach((p, k) => {
      const [x, y] = proj(p.lon, p.lat);
      const pulse = env.calm ? 0 : (st.t * 0.6 + k * 0.4) % 1;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.6 * (1 - pulse)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 6 + pulse * 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = p.id === 'ruffey' ? '#F2C14E' : `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      const label = labels[k];
      if (label && st.p > 0.35) {
        ctx.globalAlpha = env.calm ? 1 : clamp((st.p - 0.35) * 3);
        ctx.fillStyle = 'rgba(232,238,242,.92)';
        /* Ruffey et Montreux sont voisins : étiquettes de part et d'autre */
        if (p.id === 'ruffey') { ctx.textAlign = 'right'; ctx.fillText(label, x - 10, y - 9); }
        else if (p.id === 'montreux') { ctx.textAlign = 'left'; ctx.fillText(label, x + 10, y + 11); }
        else { ctx.textAlign = 'left'; ctx.fillText(label, x + 11, y - 1); }
        ctx.globalAlpha = 1;
      }
    });
  };
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = w; H = h;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const kx = W / (lonMax - lonMin), ky = H / (latMax - latMin);
    const k = Math.min(kx, ky * 1.25);
    sx = k; sy = k * 1.18;
    ox = (W - (lonMax - lonMin) * sx) / 2; oy = (H - (latMax - latMin) * sy) / 2;
    paintLand(); draw();
  };
  size(); onResize(size);
  let running = false;
  visibility(canvas, (v) => { running = v; if (v) draw(); });
  accent.listeners.push(() => { if (running) draw(); });
  /* distances : valeurs écrites dans la page, simple montée du compteur à l'arrivée */
  section.querySelectorAll('[data-dist]').forEach((el) => {
    const v = parseInt(el.dataset.dist, 10);
    if (env.calm || !v) return;
    const o = { v: 0 };
    gsap.to(o, { v, duration: 1.6, ease: 'power3.out', immediateRender: false, onStart: () => { el.textContent = '0 km'; }, onUpdate: () => { el.textContent = `${fmt(Math.round(o.v / 10) * 10)} km`; }, onComplete: () => { el.textContent = `${fmt(v)} km`; }, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
  if (env.calm) return;
  gsap.ticker.add((time) => { if (!running) return; st.t = time; draw(); });
  ScrollTrigger.create({ trigger: section, start: 'top 70%', end: 'center 40%', scrub: true, onUpdate: (s) => { st.p = s.progress; } });
  const placesEls = [...section.querySelectorAll('.place')];
  ScrollTrigger.create({ trigger: section, start: 'top 60%', end: 'bottom 40%', onUpdate: (s) => { const k = Math.min(placesEls.length - 1, Math.floor(s.progress * placesEls.length)); placesEls.forEach((el, j) => el.classList.toggle('is-active', j === k)); } });
}
