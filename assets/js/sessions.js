/* Calendrier trié automatiquement + compte à rebours */
import { SESSIONS, DEADLINE } from './data/sessions.js?v=20261028';
import { env, t } from './core.js?v=20261028';

const { gsap } = window;
const L = (o) => (o && typeof o === 'object' ? o[env.lang] : o);

export function renderSessions(scope = document) {
  const up = scope.querySelector('[data-sessions="upcoming"]');
  const past = scope.querySelector('[data-sessions="past"]');
  if (!up && !past) return;
  const today = new Date();
  const items = SESSIONS.map((s) => ({ ...s, startD: new Date(s.start + 'T00:00:00'), endD: new Date(s.end + 'T23:59:59') }));
  const upcoming = items.filter((s) => s.endD >= today).sort((a, b) => a.startD - b.startD);
  const done = items.filter((s) => s.endD < today).sort((a, b) => b.startD - a.startD);
  const base = document.documentElement.dataset.base || '';
  const row = (s, kind, first) => {
    const state = kind === 'past' ? t('Terminée', 'Completed') : (s.startD <= today ? t('En cours', 'Ongoing') : (s.confirmed ? t('Confirmée', 'Confirmed') : t('Dates à confirmer', 'Dates to be confirmed')));
    const meta = [s.place, L(s.price)].filter(Boolean).join(' · ');
    const title = s.link ? `<a class="link" href="${base}${s.link}">${L(s.title)}</a>` : L(s.title);
    return `<div class="session session--${kind}${first && kind === 'up' ? ' session--next' : ''}">
      <div class="session__title">${title}</div>
      <span class="session__state">${state}</span>
      <div class="session__when">${L(s.when)}</div>
      ${meta ? `<div class="session__meta">${meta}</div>` : ''}
    </div>`;
  };
  if (up) up.innerHTML = upcoming.length ? upcoming.map((s, i) => row(s, 'up', i === 0)).join('') : `<p class="muted">${t('Prochaines dates à compléter.', 'Next dates to be added.')}</p>`;
  if (past) past.innerHTML = done.length ? done.map((s) => row(s, 'past')).join('') : `<p class="muted">${t('Aucune session passée.', 'No past session.')}</p>`;
  scope.querySelectorAll('[data-sessions-count]').forEach((el) => { el.textContent = String(upcoming.length); });
}

export function countdowns(scope = document) {
  scope.querySelectorAll('[data-countdown]').forEach((box) => {
    const end = new Date(box.dataset.countdown || DEADLINE.date);
    // date non confirmée : on n'affiche qu'un ordre de grandeur en jours, sans fausse précision
    if (!DEADLINE.confirmed) {
      box.querySelectorAll('[data-u]').forEach((n) => { if (n.dataset.u !== 'd') n.closest('.countdown__unit').remove(); });
      const d = box.querySelector('[data-u="d"]');
      const days = Math.max(0, Math.ceil((end - new Date()) / 864e5));
      if (d) d.textContent = `≈ ${days}`;
      if (days === 0) { const o = box.querySelector('[data-over]'); if (o) o.hidden = false; }
      return;
    }
    const nums = { d: box.querySelector('[data-u="d"]'), h: box.querySelector('[data-u="h"]'), m: box.querySelector('[data-u="m"]'), s: box.querySelector('[data-u="s"]') };
    const prev = {};
    const set = (k, v) => {
      const s = String(v).padStart(k === 'd' ? 3 : 2, '0');
      if (prev[k] === s || !nums[k]) return;
      prev[k] = s; nums[k].textContent = s;
      if (!env.calm && k !== 's') gsap.fromTo(nums[k], { yPercent: -35, opacity: 0.2 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    };
    const tick = () => {
      let ms = end - new Date();
      if (ms <= 0) { ['d', 'h', 'm', 's'].forEach((k) => set(k, 0)); box.classList.add('is-over'); const o = box.querySelector('[data-over]'); if (o) o.hidden = false; return; }
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      set('d', d); set('h', h); set('m', m); set('s', Math.floor(ms / 1000));
    };
    tick(); setInterval(tick, 1000);
  });
}
