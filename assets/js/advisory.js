/* ICC Advisory : scan des potentiels invisibles, renversements, 5 axes, financement systémique, cartographie (démo), expéditions */
import { env, t, clamp, accent, tilt, counters, visibility, onResize } from './core.js';
import { mountSky } from './constellation.js';
import { wizards } from './wizard.js';

const { gsap, ScrollTrigger } = window;
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export function heroChars(hero) {
  if (!hero) return;
  const title = hero.querySelector('.hero__title');
  const rest = hero.querySelectorAll('[data-hero-in]');
  const media = hero.querySelector('.hero__media');
  if (env.calm || !window.SplitText) return;
  const split = window.SplitText.create(title, { type: 'words,chars', charsClass: 'char' });
  const r = rng(5);
  const spread = Math.min(420, window.innerWidth * 0.55);
  gsap.set(rest, { opacity: 0, y: 20 });
  const tl = gsap.timeline({ delay: 0.15 });
  if (media) tl.fromTo(media, { opacity: 0, scale: 1.1 }, { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 0);
  // les lettres naissent de points épars et se rassemblent
  tl.from(split.chars, { x: () => (r() - 0.5) * spread, y: () => (r() - 0.5) * spread * 0.7, opacity: 0, scale: 0.2, filter: 'blur(8px)', duration: 1.5, ease: 'expo.out', stagger: { each: 0.012, from: 'random' } }, 0.1)
    .to(rest, { opacity: 1, y: 0, stagger: 0.08, duration: 1, ease: 'power3.out' }, 0.9);
  document.documentElement.classList.remove('hero-pending');
  if (media) gsap.to(media, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
}

function scan() {
  const sec = document.querySelector('#metier');
  if (!sec) return;
  const frame = sec.querySelector('.scan__frame');
  const canvas = frame.querySelector('canvas');
  const line = frame.querySelector('.scan__line');
  const items = [...sec.querySelectorAll('.scan__list li')];
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [], edges = [];
  const build = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = frame.clientWidth; H = frame.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(42); nodes = [];
    const n = Math.round((W * H) / 9000);
    for (let i = 0; i < n; i++) nodes.push({ x: r() * W, y: r() * H, s: 1.5 + r() * 2.5, k: r() });
    edges = [];
    nodes.forEach((a, i) => nodes.forEach((b, j) => { if (j > i && Math.hypot(a.x - b.x, a.y - b.y) < Math.min(W, H) * 0.2 && r() < 0.5) edges.push([a, b]); }));
  };
  const state = { p: env.calm ? 1 : 0 };
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    const x0 = state.p * W;
    const c = accent.rgb;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, x0, H); ctx.clip();
    ctx.fillStyle = 'rgba(6,17,29,.5)'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (const [a, b] of edges) { ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},.55)`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (const a of nodes) {
      ctx.fillStyle = a.k > 0.8 ? 'rgba(242,193,78,.95)' : 'rgba(232,238,242,.9)';
      ctx.beginPath(); ctx.arc(a.x, a.y, a.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (line) line.style.transform = `translateX(${x0}px)`;
    if (line) line.style.opacity = state.p > 0.001 && state.p < 0.999 ? '1' : '0';
    items.forEach((li, i) => li.classList.toggle('is-on', state.p > (i + 0.6) / (items.length + 0.4)));
  };
  build(); draw();
  onResize(() => { build(); draw(); });
  let seen = false;
  visibility(frame, (v) => { seen = v; });
  accent.listeners.push(() => { if (seen) draw(); });
  if (env.calm) { items.forEach((li) => li.classList.add('is-on')); return; }
  ScrollTrigger.create({ trigger: frame, start: 'top 80%', end: 'bottom 35%', scrub: 0.5, onUpdate: (s) => { state.p = s.progress; draw(); } });
}

function reversals() {
  const sec = document.querySelector('#renversements');
  if (!sec || env.calm) return;
  const pairs = [...sec.querySelectorAll('.flip__pair')];
  const count = sec.querySelector('[data-flip-count]');
  const yes = pairs.map((p) => p.querySelector('.flip__yes'));
  const full = yes.map((y) => y.textContent);
  let current = -1;
  const activate = (k) => {
    if (k === current) return;
    current = k;
    pairs.forEach((p, i) => p.classList.toggle('is-active', i === k));
    if (count) count.textContent = `${String(k + 1).padStart(2, '0')} / ${String(pairs.length).padStart(2, '0')}`;
    const no = pairs[k].querySelector('.flip__no');
    gsap.fromTo(no, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
    yes[k].textContent = '';
  };
  const scrambled = new Set();
  const bars = [...sec.querySelectorAll('.flip__bars i')];
  if (!env.desktop() && window.innerHeight < 560) { sec.classList.add('no-pin'); yes.forEach((y, i) => { y.textContent = full[i]; }); return; }
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => `+=${window.innerHeight * 4}`, pin: sec.querySelector('.flip__stage'), anticipatePin: 1,
    onUpdate: (s) => {
      const p = s.progress * pairs.length; const k = Math.min(pairs.length - 1, Math.floor(p)); const local = p - k;
      bars.forEach((b, j) => b.style.setProperty('--p', clamp(p - j).toFixed(3)));
      if (k !== current) { scrambled.delete(k); activate(k); }
      pairs[k].querySelector('.flip__no').style.setProperty('--strike', clamp(local * 2.6).toFixed(3));
      if (local > 0.38 && !scrambled.has(k)) {
        scrambled.add(k);
        if (window.ScrambleTextPlugin) gsap.to(yes[k], { duration: 1.1, scrambleText: { text: full[k], chars: 'ICCrégénératifsystème·', revealDelay: 0.25, speed: 0.6 }, ease: 'none' });
        else yes[k].textContent = full[k];
      }
      if (local <= 0.38 && scrambled.has(k)) { scrambled.delete(k); gsap.killTweensOf(yes[k]); yes[k].textContent = ''; }
    },
  });
  activate(0);
}

function axes() {
  const row = document.querySelector('.axes__row');
  if (!row) return;
  const cards = [...row.querySelectorAll('.axe')];
  cards.forEach((c, i) => { c.style.backgroundPosition = `${i * 25}% 50%`; });
  if (env.calm) return;
  const r = rng(9);
  cards.forEach((c, i) => {
    gsap.fromTo(c, { y: (i % 2 ? 1 : -1) * (60 + r() * 80), x: (i - 2) * -40, rotation: (r() - 0.5) * 14, scale: 0.86 }, { y: 0, x: 0, rotation: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: row, start: 'top 95%', end: 'center 55%', scrub: 0.6 } });
  });
  gsap.from('.axes__caption', { opacity: 0, y: 20, scrollTrigger: { trigger: row, start: 'center 60%', once: true } });
}

function flow() {
  const box = document.querySelector('.flow__chart');
  if (!box) return;
  const sources = JSON.parse(box.dataset.sources);
  const hub = box.dataset.hub; const out1 = box.dataset.out1; const out2 = box.dataset.out2;
  const NS = 'http://www.w3.org/2000/svg';
  let paths = [], dots = [], running = false, prog = env.calm ? 1 : 0, st = null;
  const applyProg = () => paths.forEach((p, i) => { const L = +p.dataset.len; const local = p.classList.contains('path--out') ? clamp((prog - 0.6) / 0.4) : clamp(prog * 1.4 - i * 0.04); p.style.strokeDashoffset = L * (1 - local); });
  const render = () => {
    const desk = window.innerWidth >= 820;
    // ordinateur : sources à gauche, centre, résultat à droite ; téléphone : sources empilées avec leurs libellés
    const W = desk ? 1240 : 400, H = desk ? 600 : 530;
    let s = `<svg class="flow__svg${desk ? '' : ' is-mobile'}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${box.dataset.aria}">`;
    const hx = desk ? 650 : 318, hy = desk ? H / 2 : 184, hr = desk ? 74 : 50;
    const pts = sources.map((_, i) => desk ? [280, 40 + i * ((H - 80) / (sources.length - 1))] : [176, 34 + i * 50]);
    pts.forEach(([x, y], i) => {
      const d = desk ? `M${x},${y} C${x + 200},${y} ${hx - 220},${hy} ${hx - hr},${hy}` : `M${x},${y} C${x + 70},${y} ${hx - 80},${hy} ${hx - hr},${hy}`;
      s += `<path class="path" d="${d}"/>`;
      s += `<circle class="node" cx="${x}" cy="${y}" r="${desk ? 6 : 5}"/>`;
      s += `<text class="src-label" x="${x - (desk ? 18 : 12)}" y="${y + 5}" text-anchor="end">${sources[i]}</text>`;
    });
    const ox = desk ? 960 : 200, oy = desk ? hy : 432;
    const dOut = desk ? `M${hx + hr},${hy} C${hx + 160},${hy} ${ox - 160},${oy} ${ox - 8},${oy}` : `M${hx},${hy + hr} C${hx},${hy + 140} ${ox},${oy - 120} ${ox},${oy - 12}`;
    s += `<path class="path path--out" d="${dOut}"/>`;
    s += `<circle cx="${hx}" cy="${hy}" r="${hr}" fill="var(--accent)"/>`;
    const hubLines = hub.split(' ');
    const mid = Math.ceil(hubLines.length / 2);
    s += `<text class="hub-label" x="${hx}" y="${hy - 4}" text-anchor="middle">${hubLines.slice(0, mid).join(' ')}</text><text class="hub-label" x="${hx}" y="${hy + 16}" text-anchor="middle">${hubLines.slice(mid).join(' ')}</text>`;
    s += `<circle cx="${ox}" cy="${oy}" r="9" fill="#F2C14E"/>`;
    if (desk) s += `<text class="out-label" x="${ox + 22}" y="${oy - 6}">${out1}</text><text class="out-label" x="${ox + 22}" y="${oy + 24}" style="font-size:17px;fill:var(--slate)">${out2}</text>`;
    else s += `<text class="out-label" x="${ox}" y="${oy + 42}" text-anchor="middle" style="font-size:20px">${out1}</text><text class="out-label" x="${ox}" y="${oy + 66}" text-anchor="middle" style="font-size:15px;fill:var(--slate)">${out2}</text>`;
    s += '</svg>';
    box.innerHTML = s;
    const svg = box.querySelector('svg');
    paths = [...svg.querySelectorAll('.path')];
    dots = env.calm ? [] : paths.map((p, i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', p.classList.contains('path--out') ? 4.5 : 3); c.setAttribute('class', 'dot'); c.dataset.o = String((i * 0.137) % 1); svg.appendChild(c); return c; });
    paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.len = L; });
    applyProg();
  };
  render();
  onResize(render);
  if (env.calm) return;
  st = ScrollTrigger.create({ trigger: box, start: 'top 80%', end: 'bottom 55%', scrub: 0.6, onUpdate: (s) => { prog = s.progress; applyProg(); } });
  visibility(box, (v) => { running = v; });
  gsap.ticker.add((time) => {
    if (!running) return;
    paths.forEach((p, i) => {
      const L = +p.dataset.len; const off = +dots[i].dataset.o;
      const visible = p.classList.contains('path--out') ? prog > 0.95 : prog > 0.7;
      const u = ((time * 0.18) + off) % 1;
      const pt = p.getPointAtLength(u * L);
      dots[i].setAttribute('cx', pt.x); dots[i].setAttribute('cy', pt.y);
      dots[i].setAttribute('opacity', visible ? Math.sin(u * Math.PI).toFixed(2) : '0');
    });
  });
}

function ecosystem() {
  const panel = document.querySelector('.eco__panel');
  if (!panel) return;
  const canvas = panel.querySelector('canvas');
  const tip = panel.querySelector('.eco__tip');
  const ctx = canvas.getContext('2d');
  const types = JSON.parse(panel.dataset.types);
  const legend = document.querySelectorAll('.eco__legend button');
  const reveal = document.querySelector('[data-eco-reveal]');
  const statA = document.querySelector('[data-eco="existing"]'); const statB = document.querySelector('[data-eco="potential"]');
  const r = rng(2026);
  const nodes = []; const counts = [9, 7, 6, 7, 8, 5];
  // grappes par type d'acteur, disposées en couronne ; points répartis en spirale dans chaque grappe
  const golden = Math.PI * (3 - Math.sqrt(5));
  types.forEach((ty, k) => {
    const a = (k / types.length) * Math.PI * 2 - Math.PI / 2;
    const cx = 0.5 + Math.cos(a) * 0.3, cy = 0.52 + Math.sin(a) * 0.29;
    for (let i = 0; i < counts[k]; i++) {
      const rr = 0.095 * Math.sqrt((i + 0.6) / counts[k]);
      nodes.push({ type: k, n: i + 1, x: cx + Math.cos(i * golden + k) * rr + (r() - 0.5) * 0.02, y: cy + Math.sin(i * golden + k) * rr * 1.2 + (r() - 0.5) * 0.02 });
    }
  });
  // coopérations existantes : surtout à l'intérieur d'une grappe, quelques ponts entre voisines
  const links = []; const pot = [];
  const near = (a, b) => (Math.abs(a.type - b.type) === 1 || Math.abs(a.type - b.type) === types.length - 1);
  nodes.forEach((a, i) => nodes.forEach((b, j) => {
    if (j <= i) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (a.type === b.type) { if (d < 0.13 && r() < 0.55) links.push([i, j]); }
    else if (near(a, b) && d < 0.3 && r() < 0.05) links.push([i, j]);
    else if (!near(a, b) && r() < 0.035) pot.push([i, j]);
  }));
  let W, H, dpr, showPot = false, hover = -1;
  const visibleType = types.map(() => true);
  const size = () => { dpr = Math.min(2, window.devicePixelRatio || 1); W = panel.clientWidth; H = panel.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  size();
  const P = (n, time) => [n.x * W + (env.calm ? 0 : Math.sin(time * 0.0006 + n.n * 1.7) * 3), n.y * H + (env.calm ? 0 : Math.cos(time * 0.0005 + n.n) * 3)];
  const updateStats = () => {
    const ok = ([i, j]) => visibleType[nodes[i].type] && visibleType[nodes[j].type];
    if (statA) statA.textContent = links.filter(ok).length;
    if (statB) statB.textContent = showPot ? pot.filter(ok).length : '—';
  };
  const draw = (time = 0) => {
    ctx.clearRect(0, 0, W, H);
    const pos = nodes.map((n) => P(n, time));
    const hl = (i) => hover === -1 || hover === i;
    links.forEach(([i, j]) => {
      if (!visibleType[nodes[i].type] || !visibleType[nodes[j].type]) return;
      const on = hover === -1 || hover === i || hover === j;
      ctx.strokeStyle = on ? 'rgba(232,238,242,.32)' : 'rgba(232,238,242,.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(...pos[i]); ctx.lineTo(...pos[j]); ctx.stroke();
    });
    if (showPot) {
      ctx.setLineDash([4, 5]);
      pot.forEach(([i, j]) => {
        if (!visibleType[nodes[i].type] || !visibleType[nodes[j].type]) return;
        const on = hover === -1 || hover === i || hover === j;
        ctx.strokeStyle = on ? 'rgba(242,193,78,.85)' : 'rgba(242,193,78,.15)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(...pos[i]); ctx.lineTo(...pos[j]); ctx.stroke();
      });
      ctx.setLineDash([]);
    }
    nodes.forEach((n, i) => {
      if (!visibleType[n.type]) return;
      const [x, y] = pos[i];
      ctx.globalAlpha = hl(i) || links.some(([a, b]) => (a === hover && b === i) || (b === hover && a === i)) ? 1 : 0.35;
      ctx.fillStyle = types[n.type].color;
      ctx.beginPath(); ctx.arc(x, y, i === hover ? 8 : 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    });
  };
  const pick = (e) => {
    const b = panel.getBoundingClientRect(); const mx = e.clientX - b.left, my = e.clientY - b.top;
    let best = -1, bd = e.pointerType === 'touch' ? 34 : 22;
    nodes.forEach((n, i) => { if (!visibleType[n.type]) return; const d = Math.hypot(n.x * W - mx, n.y * H - my); if (d < bd) { bd = d; best = i; } });
    hover = best;
    if (best >= 0) { tip.style.left = `${clamp(nodes[best].x, 0.18, 0.82) * W}px`; tip.style.top = `${nodes[best].y * H}px`; tip.textContent = `${types[nodes[best].type].label} · ${t('acteur fictif', 'fictional actor')} ${nodes[best].n}`; tip.style.opacity = '1'; } else tip.style.opacity = '0';
    if (env.calm) draw();
  };
  panel.addEventListener('pointermove', pick);
  panel.addEventListener('pointerdown', pick);
  panel.addEventListener('pointerleave', () => { hover = -1; tip.style.opacity = '0'; if (env.calm) draw(); });
  legend.forEach((btn) => btn.addEventListener('click', () => { const k = +btn.dataset.type; visibleType[k] = !visibleType[k]; btn.setAttribute('aria-pressed', visibleType[k] ? 'true' : 'false'); updateStats(); if (env.calm) draw(); }));
  if (reveal) reveal.addEventListener('click', () => { showPot = !showPot; reveal.setAttribute('aria-pressed', showPot ? 'true' : 'false'); reveal.querySelector('.btn__label').textContent = showPot ? reveal.dataset.hide : reveal.dataset.show; updateStats(); if (env.calm) draw(); });
  onResize(() => { size(); draw(); });
  updateStats(); draw();
  if (env.calm) return;
  let running = false; visibility(panel, (v) => { running = v; });
  gsap.ticker.add(() => { if (running) draw(performance.now()); });
}

function expedition() {
  const path = document.querySelector('.exp__path svg path');
  if (!path) return;
  const list = document.querySelector('.exp__path');
  let prog = env.calm ? 1 : 0;
  const fit = () => { const h = list.clientHeight; path.setAttribute('d', `M10,0 L10,${h}`); path.parentNode.setAttribute('viewBox', `0 0 20 ${h}`); const L = path.getTotalLength(); path.style.strokeDasharray = L; path.style.strokeDashoffset = L * (1 - prog); return L; };
  let L = fit();
  onResize(() => { L = fit(); });
  if (env.calm) return;
  ScrollTrigger.create({ trigger: list, start: 'top 75%', end: 'bottom 50%', scrub: 0.5, onUpdate: (s) => { prog = s.progress; path.style.strokeDashoffset = L * (1 - prog); } });
  gsap.from(list.querySelectorAll('li'), { opacity: 0, x: 20, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: list, start: 'top 80%', once: true } });
  const media = document.querySelector('.exp__media img');
  if (media) gsap.fromTo(media, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.exp', start: 'top bottom', end: 'bottom top', scrub: true } });
}

export function initAdvisory() {
  const hero = document.querySelector('.hero');
  mountSky({ intro: false, until: hero });
  heroChars(hero);
  scan();
  reversals();
  axes();
  flow();
  ecosystem();
  expedition();
  tilt();
  counters();
  wizards();
}
