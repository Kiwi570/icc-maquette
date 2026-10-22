/* Calendrier des sessions : le seul fichier à modifier pour mettre à jour les dates.
   Les sessions sont triées automatiquement entre « à venir » et « passées » selon la date du jour.
   confirmed: false = période habituelle indiquée par ICC, dates exactes à compléter. */
export const SESSIONS = [
  {
    id: 'jim-2026', start: '2026-06-01', end: '2026-08-31', confirmed: true,
    title: { fr: 'Junior Impact Maker – session d’été', en: 'Junior Impact Maker – summer session' },
    when: { fr: 'Été 2026', en: 'Summer 2026' }, place: 'New York',
    link: 'junior-impact-maker.html',
  },
  {
    id: 'jim-2027-3m', start: '2027-06-01', end: '2027-08-31', confirmed: false,
    title: { fr: 'Junior Impact Maker – formule 3 mois', en: 'Junior Impact Maker – 3-month track' },
    when: { fr: 'Juin à août 2027', en: 'June to August 2027' }, place: 'New York', price: { fr: '4 000 €', en: '€4,000' },
    link: 'junior-impact-maker.html',
  },
  {
    id: 'jim-2027-1m', start: '2027-07-01', end: '2027-07-31', confirmed: false,
    title: { fr: 'Junior Impact Maker – formule 1 mois', en: 'Junior Impact Maker – 1-month track' },
    when: { fr: 'Juin ou juillet 2027', en: 'June or July 2027' }, place: 'New York', price: { fr: '2 000 €', en: '€2,000' },
    link: 'junior-impact-maker.html',
  },
  {
    id: 'odi-2027', start: '2027-07-01', end: '2027-07-31', confirmed: false,
    title: { fr: 'Capsule ODI – Objectifs de développement intérieur', en: 'IDG short course – Inner Development Goals' },
    when: { fr: '1 semaine en juillet 2027', en: '1 week in July 2027' }, place: 'Montreux', price: { fr: '2 500 CHF HT', en: 'CHF 2,500 excl. VAT' },
  },
  {
    id: 'odd-2027', start: '2027-07-01', end: '2027-07-31', confirmed: false,
    title: { fr: 'Capsule ODD – Objectifs de développement durable', en: 'SDG short course – Sustainable Development Goals' },
    when: { fr: '2 semaines en juillet 2027', en: '2 weeks in July 2027' }, place: 'New York', price: { fr: '5 000 CHF HT', en: 'CHF 5,000 excl. VAT' },
  },
];

/* Échéance indicative de candidature pour les candidats européens : 3 mois avant le début (juin) d’après la brochure.
   Passer confirmed à true quand ICC valide la date : le compte à rebours affiche alors le nombre exact de jours (et l’échéance dans la page, dans common.py). */
export const DEADLINE = { date: '2027-03-01T23:59:59+01:00', confirmed: false };
