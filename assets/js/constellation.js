/* Constellation WebGL (OGL) : ciel, arbre ICC à l'ouverture, architecture en 6 anneaux.
   Repli 2D si WebGL est indisponible ; image fixe en mode calme. */
import { Renderer } from './vendor/ogl/core/Renderer.js';
import { Camera } from './vendor/ogl/core/Camera.js';
import { Transform } from './vendor/ogl/core/Transform.js';
import { Program } from './vendor/ogl/core/Program.js';
import { Geometry } from './vendor/ogl/core/Geometry.js';
import { Mesh } from './vendor/ogl/core/Mesh.js';
import { TREE } from './data/tree.js?v=20261028';
import { env, accent, clamp, onResize } from './core.js?v=20261028';

const { gsap } = window;

function mulberry(seed) {
  return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r) => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const VERT = /* glsl */ `
attribute vec3 aSky; attribute vec3 aTree; attribute vec3 aArch; attribute vec4 aRand;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
uniform float uTime, uTree, uArch, uLevel, uPixel, uSize, uFade, uAspect, uDrift;
uniform vec2 uMouse; uniform vec3 uAccent;
varying vec3 vColor; varying float vAlpha;
void main() {
  vec3 p = mix(aSky, aTree, uTree);
  p = mix(p, aArch, uArch);
  float ph = aRand.y * 6.2831;
  p += uDrift * (1.0 - uTree) * vec3(sin(uTime * .21 + ph) * .05, cos(uTime * .17 + ph * 1.3) * .05, sin(uTime * .13 + ph * .7) * .04);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float md = length((ndc - uMouse) * vec2(uAspect, 1.0));
  float near = (1.0 - smoothstep(0.0, 0.42, md)) * (1.0 - uArch) * (1.0 - uTree);
  float hl = uArch * (1.0 - smoothstep(0.15, 0.95, abs(aRand.w - uLevel)));
  float twinkle = .78 + .22 * sin(uTime * (1.2 + aRand.x * 2.0) + ph);
  gl_PointSize = uSize * (0.55 + aRand.x * 1.25) * (1.0 + hl * 1.5 + near * 1.1 + uTree * .7 + uArch * .35) * uPixel / -mv.z;
  vec3 mist = vec3(.91, .93, .95);
  vec3 gold = vec3(.949, .757, .306);
  vec3 c = mix(mist, uAccent, step(.62, aRand.z) * .95);
  c = mix(c, gold, uTree * (.55 + .45 * aRand.z));
  c = mix(c, uAccent, hl * .9);
  vColor = c;
  float base = (.35 + .65 * aRand.x) * twinkle;
  vAlpha = base * uFade * (1.0 + uArch * .25 + hl * 1.3 + uTree * .6) + near * .5;
}`;
const FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - .5);
  // smoothstep avec bornes croissantes (bornes inversées = résultat indéfini selon les GPU)
  float a = 1.0 - smoothstep(0.0, 0.5, d);
  a = a * a * (1.0 + .6 * (1.0 - smoothstep(0.0, 0.18, d)));
  gl_FragColor = vec4(vColor, a * vAlpha);
}`;
const LVERT = /* glsl */ `
attribute vec3 aSky; attribute vec3 aTree; attribute vec3 aArch; attribute vec4 aRand;
uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;
uniform float uTime, uTree, uArch, uFade, uAspect, uDrift;
uniform vec2 uMouse;
varying float vAlpha;
void main() {
  vec3 p = mix(aSky, aTree, uTree);
  p = mix(p, aArch, uArch);
  float ph = aRand.y * 6.2831;
  p += uDrift * (1.0 - uTree) * vec3(sin(uTime * .21 + ph) * .05, cos(uTime * .17 + ph * 1.3) * .05, sin(uTime * .13 + ph * .7) * .04);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float md = length((ndc - uMouse) * vec2(uAspect, 1.0));
  float near = 1.0 - smoothstep(0.0, 0.38, md);
  vAlpha = (.05 + near * .6) * (1.0 - uTree) * (1.0 - uArch) * uFade;
}`;
const LFRAG = /* glsl */ `
precision highp float;
uniform vec3 uAccent;
varying float vAlpha;
void main() { gl_FragColor = vec4(mix(vec3(.91,.93,.95), uAccent, .65), vAlpha); }`;

export function createConstellation(canvas, opts = {}) {
  const desktop = env.desktop();
  const N = Math.min(TREE.length, desktop ? 1800 : 1100);
  const rand = mulberry(1977);
  const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, desktop ? 1.75 : 1.5), alpha: true, antialias: false, premultipliedAlpha: false });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);
  const camera = new Camera(gl, { fov: 42, near: 0.1, far: 50 });
  camera.position.set(0, 0, 5.2);
  const scene = new Transform();

  // positions des trois états
  const sky = new Float32Array(N * 3), tree = new Float32Array(N * 3), arch = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
  const weights = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]; const totalW = weights.reduce((a, b) => a + b, 0);
  const levelOf = []; let acc = 0;
  weights.forEach((w, L) => { const n = Math.round((w / totalW) * N); for (let k = 0; k < n && levelOf.length < N; k++) levelOf.push(L); acc += n; });
  while (levelOf.length < N) levelOf.push(5);
  for (let i = 0; i < N; i++) {
    const zx = rand();
    sky[i * 3] = (rand() * 2 - 1) * 5.6;
    sky[i * 3 + 1] = (rand() * 2 - 1) * 3.1;
    sky[i * 3 + 2] = -3.2 + zx * 4.2;
    const tp = TREE[i];
    tree[i * 3] = tp[0] * 1.5;
    tree[i * 3 + 1] = tp[1] * 1.5 + 0.12;
    tree[i * 3 + 2] = gauss(rand) * 0.05;
    const L = levelOf[i];
    const ang = rand() * Math.PI * 2;
    const r = (0.12 + L * 0.27) * (1 + gauss(rand) * 0.03);
    arch[i * 3] = Math.cos(ang) * r;
    arch[i * 3 + 1] = -1.15 + L * 0.46 + gauss(rand) * 0.016;
    arch[i * 3 + 2] = Math.sin(ang) * r;
    rnd[i * 4] = Math.pow(rand(), 2.2);
    rnd[i * 4 + 1] = rand();
    rnd[i * 4 + 2] = rand();
    rnd[i * 4 + 3] = L;
  }
  // liens entre voisins proches dans le ciel
  const pairs = [];
  const maxLinks = desktop ? 2600 : 1300;
  for (let i = 0; i < N && pairs.length < maxLinks; i++) {
    let found = 0;
    for (let j = i + 1; j < N && found < 3; j++) {
      const dx = sky[i * 3] - sky[j * 3], dy = sky[i * 3 + 1] - sky[j * 3 + 1], dz = sky[i * 3 + 2] - sky[j * 3 + 2];
      if (dx * dx + dy * dy + dz * dz < 0.32) { pairs.push(i, j); found++; }
    }
  }
  const M = pairs.length;
  const lsky = new Float32Array(M * 3), ltree = new Float32Array(M * 3), larch = new Float32Array(M * 3), lrnd = new Float32Array(M * 4);
  pairs.forEach((idx, k) => {
    for (let c = 0; c < 3; c++) { lsky[k * 3 + c] = sky[idx * 3 + c]; ltree[k * 3 + c] = tree[idx * 3 + c]; larch[k * 3 + c] = arch[idx * 3 + c]; }
    for (let c = 0; c < 4; c++) lrnd[k * 4 + c] = rnd[idx * 4 + c];
  });

  const uniforms = {
    uTime: { value: 0 }, uTree: { value: 0 }, uArch: { value: 0 }, uLevel: { value: 0 },
    uPixel: { value: renderer.dpr }, uSize: { value: desktop ? 26 : 22 }, uFade: { value: 1 },
    uAspect: { value: 1 }, uMouse: { value: [9, 9] }, uAccent: { value: [0.949, 0.757, 0.306] }, uDrift: { value: 1 },
  };
  const pointsProg = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms, transparent: true, depthTest: false, depthWrite: false });
  pointsProg.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
  const linesProg = new Program(gl, { vertex: LVERT, fragment: LFRAG, uniforms, transparent: true, depthTest: false, depthWrite: false });
  linesProg.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
  const geo = new Geometry(gl, { aSky: { size: 3, data: sky }, aTree: { size: 3, data: tree }, aArch: { size: 3, data: arch }, aRand: { size: 4, data: rnd } });
  const lgeo = new Geometry(gl, { aSky: { size: 3, data: lsky }, aTree: { size: 3, data: ltree }, aArch: { size: 3, data: larch }, aRand: { size: 4, data: lrnd } });
  const lines = new Mesh(gl, { mode: gl.LINES, geometry: lgeo, program: linesProg, frustumCulled: false });
  const points = new Mesh(gl, { mode: gl.POINTS, geometry: geo, program: pointsProg, frustumCulled: false });
  lines.setParent(scene); points.setParent(scene);

  const state = { active: true, archOffsetX: 0, archOffsetY: 0, archScale: 1, mouse: [9, 9], target: [9, 9], spin: 0 };
  let lastW = 0, lastH = 0;
  const resize = () => {
    // le canevas est fixe et couvre l'écran : on se cale sur la fenêtre (OGL fige sinon le canevas à 300 × 150)
    const w = window.innerWidth, h = window.innerHeight;
    if (w === lastW && Math.abs(h - lastH) < 120 && lastW) return; // barre d'adresse mobile : on ignore
    lastW = w; lastH = h;
    renderer.setSize(w, h);
    camera.perspective({ aspect: w / h });
    uniforms.uAspect.value = w / h;
    const d = env.desktop();
    const halfH = 5.2 * Math.tan((21 * Math.PI) / 180);
    const halfW = halfH * (w / h);
    if (d) {
      // anneaux centrés entre le texte (à gauche) et la liste des niveaux (à droite)
      const gutter = Math.max(16, Math.min(64, w * 0.04));
      const left = gutter + 470, right = w - gutter - 190;
      state.archOffsetX = (((left + right) / 2) / w * 2 - 1) * halfW;
      state.archOffsetY = -0.22;
      state.archScale = Math.min(1.05, ((right - left) / w) * halfW * 2 / 3.3);
    } else {
      state.archOffsetX = 0;
      // écran peu haut : anneaux plus petits et plus hauts, pour laisser la place au texte
      const short = h < 760;
      state.archOffsetY = halfH * (short ? 0.3 : 0.36);
      state.archScale = Math.min(short ? 0.42 : 0.52, (halfW * 2 * 0.8) / 3.1);
    }
    uniforms.uSize.value = d ? 24 : 19;
  };
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    state.target = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
  }, { passive: true });
  document.addEventListener('pointerleave', () => { state.target = [9, 9]; });
  accent.listeners.push((c) => { uniforms.uAccent.value = [c[0] / 255, c[1] / 255, c[2] / 255]; });

  let last = performance.now();
  /* mobile : 30 images par seconde suffisent et ménagent la batterie */
  const minFrame = desktop ? 0 : 30;
  const tick = () => {
    if (!state.active || state.lost) return;
    const now = performance.now();
    if (minFrame && now - last < minFrame) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    uniforms.uTime.value += dt;
    state.mouse[0] += (state.target[0] - state.mouse[0]) * 0.12;
    state.mouse[1] += (state.target[1] - state.mouse[1]) * 0.12;
    uniforms.uMouse.value = state.mouse;
    const a = uniforms.uArch.value;
    state.spin += dt * 0.14 * a;
    scene.rotation.x = 0.5 * a;
    scene.rotation.y = state.spin;
    scene.position.x = state.archOffsetX * a;
    scene.position.y = state.archOffsetY * a;
    const s = 1 + (state.archScale - 1) * a;
    scene.scale.set(s, s, s);
    renderer.render({ scene, camera });
  };
  gsap.ticker.add(tick);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    state.lost = true;
    if (opts.onLost) opts.onLost();
  });

  return {
    uniforms,
    setActive(v) {
      if (v === state.active) return;
      state.active = v; last = performance.now();
      canvas.style.opacity = v ? '' : '0';
    },
    fade(v) { uniforms.uFade.value = v; },
    renderOnce() { tick(); },
    intro({ onReveal } = {}) {
      uniforms.uTree.value = 0;
      uniforms.uFade.value = 0;
      const tl = gsap.timeline({ paused: true });
      // les points convergent en arbre ICC, l'arbre tient un instant, puis s'ouvre en ciel (moins de 3 s)
      tl.to(uniforms.uFade, { value: 1, duration: 0.5, ease: 'power2.out' }, 0)
        .to(uniforms.uTree, { value: 1, duration: 1.0, ease: 'power3.inOut' }, 0)
        .to(uniforms.uTree, { value: 0, duration: 1.1, ease: 'expo.inOut' }, 1.5)
        .add(() => onReveal && onReveal(), 1.8);
      // démarre après la première image réellement affichée, pour ne pas sauter l'arbre si le chargement bloque
      requestAnimationFrame(() => requestAnimationFrame(() => tl.play(0)));
      return tl;
    },
  };
}

/* Repli 2D : ciel étoilé avec liens au curseur */
export function createFallback2D(canvas, { animate = true } = {}) {
  const ctx = canvas.getContext('2d');
  let W, H, dpr, pts = [];
  const mouse = { x: -999, y: -999 };
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((W * H) / (env.desktop() ? 5200 : 7000));
    const rand = mulberry(7);
    pts = Array.from({ length: n }, () => ({ x: rand() * W, y: rand() * H, r: 0.4 + Math.pow(rand(), 3) * 1.8, p: rand() * 6.28, g: rand() > 0.72 }));
    draw(0);
  };
  const draw = (time) => {
    ctx.clearRect(0, 0, W, H);
    const c = accent.rgb;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const ax = a.x + (animate ? Math.sin(time * 0.0002 + a.p) * 6 : 0), ay = a.y + (animate ? Math.cos(time * 0.00017 + a.p) * 6 : 0);
      a.cx = ax; a.cy = ay;
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const dm = Math.hypot(a.cx - mouse.x, a.cy - mouse.y);
      if (dm > 200) continue;
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const d = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        if (d < 110) { ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(1 - d / 110) * (1 - dm / 200) * 0.7})`; ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b.cx, b.cy); ctx.stroke(); }
      }
    }
    for (const a of pts) {
      ctx.fillStyle = a.g ? `rgba(${c[0]},${c[1]},${c[2]},.9)` : 'rgba(232,238,242,.75)';
      ctx.beginPath(); ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2); ctx.fill();
    }
  };
  resize();
  onResize(resize);
  let active = true;
  if (!animate) accent.listeners.push(() => { if (active) draw(0); });
  if (animate) {
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    gsap.ticker.add(() => { if (active) draw(performance.now()); });
  }
  return { setActive(v) { active = v; canvas.style.opacity = v ? '' : '0'; } };
}

/* Branche la constellation sur la page : retourne l'objet ou null */
export function mountSky({ intro = false, onReveal, until } = {}) {
  const ScrollTrigger = window.ScrollTrigger;
  const hide = (obj) => {
    if (!until) return;
    // calculé après les sections épinglées (refreshPriority négatif), sinon le ciel s'éteint trop tôt
    ScrollTrigger.create({ trigger: until, start: 'bottom top+=10%', refreshPriority: -10, onEnter: () => obj.setActive(false), onLeaveBack: () => obj.setActive(true) });
  };
  if (env.calm || !env.webgl) {
    const c = document.createElement('canvas'); c.id = 'gl2d'; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    const fb = createFallback2D(c, { animate: !env.calm });
    hide(fb);
    if (onReveal) onReveal(true);
    return null;
  }
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  let sky;
  /* si le GPU perd le contexte (onglet en veille, mémoire), on bascule sans bruit sur le ciel 2D */
  const proxy = { target: null, setActive(v) { if (proxy.target) proxy.target.setActive(v); } };
  const onLost = () => {
    canvas.remove(); document.documentElement.classList.add('no-webgl');
    const c = document.createElement('canvas'); c.id = 'gl2d'; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    proxy.target = createFallback2D(c, { animate: true });
    if (onReveal) onReveal(true);
  };
  try { sky = createConstellation(canvas, { onLost }); } catch (e) {
    canvas.remove(); document.documentElement.classList.add('no-webgl');
    env.webgl = false; // sinon le repli rappelait la même branche WebGL sans fin (dépassement de pile)
    return mountSky({ intro: false, onReveal, until });
  }
  proxy.target = sky;
  hide(proxy);
  if (intro) sky.intro({ onReveal }); else if (onReveal) onReveal(true);
  return sky;
}
export { clamp };
