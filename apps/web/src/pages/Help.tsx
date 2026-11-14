const FAQ = [
  ['Pourquoi ne vois-je jamais le nom des jeunes ?', 'Teranga Santé ne collecte aucune identité. Chaque réservation est reliée à un code (ex : BAO-4821) que la personne présente à l’accueil.'],
  ['Comment confirmer qu’une personne est venue ?', 'Dans « Rendez-vous », cherche son code puis clique sur l’œil et « Marquer venu ».'],
  ['Comment ajouter des créneaux ?', 'Dans « Agenda », clique sur « Ajouter » ou double-clique sur une case horaire. Glisse un créneau pour le déplacer.'],
  ['Un jeune signale une urgence', 'Marque la conversation comme urgente, oriente-le vers le service adapté et, en cas de danger immédiat, invite-le à appeler les urgences.'],
  ['Une alerte de stock s’affiche', 'Elle est créée automatiquement quand un niveau passe sous le seuil. Le responsable peut aussi signaler une rupture depuis « Stocks et équipe ».'],
  ['Mes actions sont-elles enregistrées ?', 'Oui : les actions sensibles (connexion, statut des rendez-vous, contenus, exports) sont inscrites au journal d’activité.'],
];

export default function Help() {
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head"><h1>Aide</h1></div>
      {FAQ.map(([q, a]) => (
        <details key={q} className="card">
          <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{q}</summary>
          <p style={{ marginBottom: 0 }}>{a}</p>
        </details>
      ))}
    </div>
  );
}
