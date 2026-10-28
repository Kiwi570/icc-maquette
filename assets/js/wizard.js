/* Formulaires en étapes simulés : prise de rendez-vous et candidature. Aucune donnée n'est envoyée. */
import { env, t } from './core.js?v=20261028';

const { gsap } = window;

function businessDays(n) {
  const out = []; const d = new Date(); d.setHours(12, 0, 0, 0);
  while (out.length < n) { d.setDate(d.getDate() + 1); const wd = d.getDay(); if (wd !== 0 && wd !== 6) out.push(new Date(d)); }
  return out;
}
function fillSlots(form) {
  form.querySelectorAll('[data-slots]').forEach((box) => {
    const name = box.dataset.slots;
    const loc = env.lang === 'en' ? 'en-GB' : 'fr-FR';
    box.innerHTML = businessDays(10).map((d, i) => {
      const id = `${form.id}-${name}-${i}`;
      const wd = d.toLocaleDateString(loc, { weekday: 'short' });
      const mo = d.toLocaleDateString(loc, { month: 'short' });
      const full = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
      return `<label class="opt" for="${id}"><input type="radio" id="${id}" name="${name}" value="${full}" aria-label="${full}" data-label="${full}"><span aria-hidden="true">${wd} <b>${d.getDate()}</b> ${mo}</span></label>`;
    }).join('');
  });
}

const PRICES = { '1m': t('2 000 €', '€2,000'), '3m': t('4 000 €', '€4,000'), alt: t('6 000 € (ONG) ou 8 000 € (entreprise), pris en charge par l’employeur', '€6,000 (NGO) or €8,000 (company), paid by the employer') };

function applyHooks(form) {
  const box = form.querySelector('[data-elig]');
  const update = () => {
    if (!box) return;
    const en = form.querySelector('input[name="anglais"]:checked');
    const ue = form.querySelector('input[name="ue"]:checked');
    const etu = form.querySelector('input[name="etudes"]:checked');
    const msgs = [];
    if (en && en.value !== 'c1') msgs.push(t('Le programme demande un anglais courant (niveau C1). Un diplôme C1 est conseillé mais facultatif.', 'The programme requires fluent English (C1 level). A C1 certificate is recommended but optional.'));
    if (etu && etu.value === 'autre') msgs.push(t('Niveau demandé : bac +3 pour des études liées au travail des Nations Unies, bac +4 pour les autres disciplines. L’entretien avec ICC permet d’en parler.', 'Required level: 3 years of higher education for UN-related studies, 4 years for other fields. The interview with ICC is the place to discuss it.'));
    if (ue && ue.value === 'non') msgs.push(t('Hors Union européenne : candidater au moins 6 mois avant le début du programme, pour le délai de visa.', 'Outside the European Union: apply at least 6 months before the programme starts, to allow for the visa.'));
    if (ue && ue.value === 'oui') msgs.push(t('Union européenne : candidature possible jusqu’à 3 mois avant le début du programme.', 'European Union: you can apply up to 3 months before the programme starts.'));
    if (ue) msgs.push(t('Selon votre nationalité et la formule, une ESTA ou un visa J-1 peut être nécessaire : ICC vous oriente lors de l’entretien.', 'Depending on your nationality and the track, an ESTA or a J-1 visa may be required: ICC will guide you during the interview.'));
    box.innerHTML = msgs.map((m) => `<p class="alert">${m}</p>`).join('');
  };
  form.addEventListener('change', update);
  return {
    recap(rows) {
      const f = form.querySelector('input[name="formule"]:checked');
      if (f) rows.push([t('Tarif indiqué', 'Listed price'), PRICES[f.value]]);
      return rows;
    },
  };
}

function textOf(input) {
  if (input.dataset.label) return input.dataset.label;
  const span = input.nextElementSibling;
  return span ? span.textContent.replace(/\s+/g, ' ').trim() : input.value;
}

/* Un lien peut présélectionner un choix du formulaire visé (sujet, formule) */
let presetsReady = false;
function presets() {
  if (presetsReady) return;
  presetsReady = true;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-preset]');
    if (!a) return;
    let target = null;
    try { target = document.querySelector(a.getAttribute('href')); } catch (err) { target = null; }
    const form = target && (target.matches('form') ? target : target.querySelector('form[data-wizard]'));
    if (!form) return;
    const input = form.querySelector(`input[value="${a.dataset.preset}"]`);
    if (input) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); }
  });
}

export function wizards(scope = document) {
  presets();
  scope.querySelectorAll('form[data-wizard]').forEach((form) => {
    fillSlots(form);
    const panels = [...form.querySelectorAll('.wizard__panel[data-step]')];
    const done = form.querySelector('[data-done]');
    const bar = form.querySelector('.wizard__steps');
    const prev = form.querySelector('[data-prev]');
    const next = form.querySelector('[data-next]');
    const nav = form.querySelector('.wizard__nav');
    const err = form.querySelector('[data-err]');
    const hooks = form.dataset.wizard === 'apply' ? applyHooks(form) : null;
    let i = 0;
    if (bar) bar.innerHTML = panels.map(() => '<i></i>').join('');
    const preset = form.dataset.preset;
    if (preset) { const p = form.querySelector(`input[value="${preset}"]`); if (p) p.checked = true; }

    const count = form.querySelector('.wizard__count');
    panels.forEach((p) => p.setAttribute('tabindex', '-1'));
    const show = (k, dir = 1, moveFocus = false) => {
      panels.forEach((p, j) => p.classList.toggle('is-active', j === k));
      if (bar) [...bar.children].forEach((d, j) => d.classList.toggle('is-done', j <= k));
      if (count) count.textContent = `${count.dataset.countLabel} ${k + 1} / ${panels.length}`;
      prev.hidden = k === 0;
      next.querySelector('.btn__label').textContent = k === panels.length - 1 ? next.dataset.labelSubmit : next.dataset.labelNext;
      if (err) { err.textContent = ''; err.hidden = true; }
      if (!env.calm) gsap.fromTo(panels[k], { opacity: 0, x: 24 * dir }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
      if (moveFocus) {
        // clavier et lecteur d'écran : on se place au début de l'étape (sans ouvrir le clavier sur mobile)
        const first = panels[k].querySelector('input');
        const target = first && (first.type === 'radio' || first.type === 'checkbox' || !env.touch) ? first : panels[k];
        target.focus({ preventScroll: true });
      }
    };
    const validate = (panel) => {
      let ok = true; let msg = '';
      panel.querySelectorAll('[data-required]').forEach((fs) => {
        if (!fs.querySelector('input:checked')) { ok = false; msg = fs.dataset.required; }
      });
      panel.querySelectorAll('input[required], textarea[required]').forEach((inp) => {
        const e = inp.closest('.field')?.querySelector('.field__err');
        let bad = !inp.value.trim();
        if (!bad && inp.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim());
        if (e) e.textContent = bad ? (inp.type === 'email' && inp.value.trim() ? t('Adresse e-mail incomplète, par exemple nom@domaine.fr', 'Incomplete email address, for example name@domain.com') : t('Champ à remplir', 'Required field')) : '';
        inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) ok = false;
      });
      if (err) { err.textContent = !ok && msg ? msg : ''; err.hidden = !(!ok && msg); }
      if (!ok) { const first = panel.querySelector('[aria-invalid="true"]') || panel.querySelector('input'); if (first) first.focus(); }
      return ok;
    };
    const recap = () => {
      let rows = [];
      form.querySelectorAll('[data-recap-label]').forEach((el) => {
        const label = el.dataset.recapLabel;
        if (el.tagName === 'FIELDSET' || el.tagName === 'DIV') {
          const vals = [...el.querySelectorAll('input:checked')].map(textOf);
          if (vals.length) rows.push([label, vals.join(', ')]);
        } else if (el.value && el.value.trim()) rows.push([label, el.value.trim()]);
      });
      if (hooks) rows = hooks.recap(rows);
      const dl = done.querySelector('[data-recap]');
      dl.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v.replace(/</g, '&lt;')}</dd>`).join('');
    };
    prev.addEventListener('click', () => { if (i > 0) { i -= 1; show(i, -1, true); } });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validate(panels[i])) return;
      if (i < panels.length - 1) { i += 1; show(i, 1, true); return; }
      recap();
      panels.forEach((p) => p.classList.remove('is-active'));
      nav.hidden = true; done.hidden = false;
      if (bar) [...bar.children].forEach((d) => d.classList.add('is-done'));
      const h = done.querySelector('h3'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      if (!env.calm) gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
    });
    form.querySelector('[data-restart]')?.addEventListener('click', () => {
      form.reset(); done.hidden = true; nav.hidden = false; i = 0; show(0, 1, true);
      const el = form.querySelector('[data-elig]'); if (el) el.innerHTML = '';
    });
    show(0);
  });
}
