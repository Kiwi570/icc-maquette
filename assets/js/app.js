import { detect, calmToggle, smoothScroll, anchors, header, menu, cursor, magnetic, splitReveals, accentScroll, veil, yearStamp, breakpointWatch, restorePosition } from './core.js?v=20261028';

detect();
smoothScroll();
calmToggle();
anchors();
header();
menu();
cursor();
accentScroll();
veil();
yearStamp();
breakpointWatch();

const page = (document.querySelector('main[data-page]') || document.body).dataset.page;
const start = async () => {
  try {
    if (page === 'home') (await import('./home.js?v=20261028')).initHome();
    else if (page === 'advisory') (await import('./advisory.js?v=20261028')).initAdvisory();
    else if (page === 'jim') (await import('./jim.js?v=20261028')).initJim();
  } catch (e) {
    console.error(e);
    document.documentElement.classList.add('calm');
  }
  // les héros ont posé leur état de départ : le masquage de sécurité n'a plus lieu d'être
  document.documentElement.classList.remove('hero-pending');
  splitReveals();
  magnetic();
  // ancre d'arrivée ou section mémorisée : on s'y rend une fois les sections épinglées mesurées
  let jumped = false;
  const refresh = () => {
    window.ScrollTrigger.refresh();
    if (!jumped) { jumped = true; requestAnimationFrame(() => { restorePosition(); }); }
  };
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  if (document.readyState === 'complete') fontsReady.then(refresh);
  else window.addEventListener('load', () => fontsReady.then(refresh), { once: true });
};
start();
