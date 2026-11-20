import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL, RETENTION } from '../../lib/legal';
import { SiteLayout } from './SiteLayout';

// Pages légales du site : mentions légales, politique de confidentialité, conditions d'utilisation.
// Le contenu décrit les traitements RÉELLEMENT présents dans le code (apps/mobile, apps/web, supabase).
// Les informations d'identification viennent de lib/legal.ts (une seule source).

function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <SiteLayout title={title} description={description}>
      <article className="site-section">
        <div className="site-wrap article legal">
          <h1 className="section-title" style={{ textAlign: 'left', fontSize: 34 }}>{title}</h1>
          <p className="small muted">Dernière mise à jour : {LEGAL.updatedAt}</p>
          <div className="article-body">{children}</div>
        </div>
      </article>
    </SiteLayout>
  );
}

const Mail = ({ to }: { to: string }) => (to.startsWith('[') ? <mark>{to}</mark> : <a href={`mailto:${to}`}>{to}</a>);
const V = ({ v }: { v: string }) => (v.startsWith('[') ? <mark>{v}</mark> : <>{v}</>);

/* ------------------------------------------------------------------ Mentions légales */
export function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" description="Qui édite Teranga Santé, comment nous contacter et qui héberge le site et les données.">
      <h2>Éditeur</h2>
      <p>
        Teranga Santé est un projet non commercial, gratuit, créé dans le cadre du hackathon Hack4VIH et édité par une équipe de
        particuliers établie au Sénégal, sans structure juridique : <V v={LEGAL.publishers} />.
      </p>
      <ul>
        <li>Responsable de la publication : <V v={LEGAL.publicationDirector} /></li>
        <li>Adresse : <V v={LEGAL.address} /></li>
        <li>Email : <Mail to={LEGAL.email} /></li>
        {LEGAL.phone && <li>Téléphone : {LEGAL.phone}</li>}
      </ul>

      <h2>Hébergement</h2>
      <h3>Site web</h3>
      <ul>
        <li>Hébergeur : <V v={LEGAL.siteHost.name} /></li>
        <li>Adresse : <V v={LEGAL.siteHost.address} /></li>
        <li>Contact : <V v={LEGAL.siteHost.contact} /></li>
      </ul>
      <h3>Base de données, comptes et fichiers (application et espace professionnel)</h3>
      <ul>
        <li>Hébergeur : {LEGAL.dataHost.name}</li>
        <li>Adresse : <V v={LEGAL.dataHost.address} /></li>
        <li>Contact : {LEGAL.dataHost.contact}</li>
        <li>Lieu de stockage des données : <V v={LEGAL.dataHost.location} /></li>
      </ul>

      <h2>Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la <Link to="/confidentialite">politique de confidentialité</Link>. Référence de la
        formalité auprès de la {LEGAL.authority.name} : <V v={LEGAL.cdpReference} />.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le nom Teranga Santé, le logo, la mascotte Baobi, les illustrations et les textes du site sont la propriété de leurs auteurs.
        Toute reproduction sans autorisation est interdite. Les fiches santé sont rédigées par les professionnels de santé
        partenaires.
      </p>
      <p>
        Crédits : police Poppins (licence SIL Open Font License), icônes Lucide (licence ISC). Dans l’application : fonds de carte
        © les contributeurs d’OpenStreetMap (licence ODbL), bibliothèque Leaflet (licence BSD).
      </p>

      <h2>Information médicale</h2>
      <p>
        Les informations publiées ne remplacent pas une consultation. Teranga Santé n’est pas un service d’urgence : en cas de danger
        immédiat, appelez le SAMU au 1515.
      </p>
    </LegalPage>
  );
}

/* ------------------------------------------------------------------ Politique de confidentialité */
type Row = { name: string; data: string; purpose: string; basis: string; who: string };

const TREATMENTS: Row[] = [
  {
    name: 'Profil de jeu (application)',
    data: 'Pseudo (pas ton vrai nom), avatar, langue, points, série de jours, badges, date de la dernière partie, et un identifiant technique anonyme créé automatiquement. Aucun nom, numéro, email ni date de naissance n’est demandé.',
    purpose: 'Faire fonctionner le jeu et permettre de réserver ou d’écrire à une infirmière depuis le même téléphone.',
    basis: 'Ton acceptation des conditions d’utilisation à la création du profil.',
    who: 'Personne d’autre que toi ne voit ton profil. Les infirmières ne voient pas ton pseudo.',
  },
  {
    name: 'Rendez-vous',
    data: 'Code de rendez-vous (ex. BAO-4821), centre choisi, service (dépistage, conseil, PrEP, consultation), créneau, infirmière, statut (confirmé, venu, absent, annulé, reporté). Ce sont des données de santé.',
    purpose: 'Réserver, organiser l’accueil au centre et produire des statistiques anonymes par région.',
    basis: 'Ton consentement exprès, donné en confirmant la réservation.',
    who: 'Les infirmières et le responsable du centre choisi. Le super administrateur pour la maintenance. L’administration nationale ne voit que des chiffres anonymes (région, date).',
  },
  {
    name: 'Discussion avec une infirmière',
    data: 'Messages écrits et messages vocaux, date d’envoi et de lecture, mention « urgent » ou « clôturé ». Ce sont des données de santé.',
    purpose: 'Te permettre de parler à une infirmière et d’être orienté.',
    basis: 'Ton consentement exprès, donné en envoyant ton premier message.',
    who: 'L’infirmière qui prend en charge la conversation (avant sa prise en charge : les infirmières habilitées à la prendre). Les vocaux sont stockés dans un espace privé, lisibles seulement par un lien temporaire d’une heure.',
  },
  {
    name: 'Assistant Baobi (intelligence artificielle)',
    data: 'Le texte de ta question et des échanges précédents de la même discussion, ou l’enregistrement de ta question vocale pour la transcrire. Les numéros de téléphone et les emails sont masqués automatiquement avant l’envoi. Un compteur du nombre de questions par jour est associé à ton identifiant technique.',
    purpose: 'Répondre à tes questions et t’orienter ; le compteur limite les abus et les coûts.',
    basis: 'Ton consentement exprès, donné en utilisant l’assistant.',
    who: 'Groq, Inc. (États-Unis), qui fournit le modèle d’IA et la transcription. La discussion n’est pas enregistrée dans notre base : seuls le sujet général et l’orientation proposée sont comptés, sans lien avec toi.',
  },
  {
    name: 'Signalements',
    data: 'Type de signalement (discrimination, refus de soins, atteinte à la confidentialité, violence, autre), texte libre, région, réponse apportée.',
    purpose: 'Traiter les signalements et améliorer l’accueil dans les centres.',
    basis: 'Ton consentement exprès, donné en envoyant le signalement.',
    who: 'L’administration nationale et le super administrateur.',
  },
  {
    name: 'Comptes des professionnels (espace professionnel)',
    data: 'Email, nom affiché, rôle, centre, spécialité, langues, présentation, numéro professionnel (facultatif), statut (en ligne, occupée, absente), date de dernière connexion. Le mot de passe est enregistré sous une forme chiffrée irréversible.',
    purpose: 'Donner accès à l’espace professionnel et permettre aux jeunes de joindre une infirmière.',
    basis: 'L’exécution des conditions d’utilisation acceptées à la première connexion.',
    who: 'Le responsable du centre et le super administrateur. Le nom affiché, la spécialité, les langues, la présentation, le statut et le numéro professionnel sont visibles par les jeunes dans l’application.',
  },
  {
    name: 'Journal d’activité',
    data: 'Pour chaque action sensible (connexion, statut d’un rendez-vous, création de compte, modification de contenu, export) : son auteur, l’action et la date.',
    purpose: 'Sécurité et traçabilité des accès aux données de santé.',
    basis: 'L’obligation de sécurité qui pèse sur le responsable du traitement.',
    who: 'Le super administrateur.',
  },
  {
    name: 'Données techniques',
    data: 'Adresse IP, type d’appareil et de navigateur, dates des requêtes, enregistrés dans les journaux techniques de nos hébergeurs.',
    purpose: 'Faire fonctionner et sécuriser le service.',
    basis: 'L’obligation de sécurité du responsable du traitement.',
    who: 'Nos hébergeurs (voir plus bas), pour une durée courte fixée par leur offre.',
  },
];

export function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" description="Quelles données Teranga Santé traite, pourquoi, combien de temps, qui y a accès et comment exercer tes droits.">
      <p className="lead">
        Teranga Santé est conçue pour que tu puisses t’informer, te faire dépister et parler à une infirmière <strong>sans donner ton
        nom</strong>. Mais certaines données sont nécessaires, et certaines sont des <strong>données de santé</strong> : voici
        lesquelles, en toute transparence.
      </p>

      <h2>Qui est responsable de tes données ?</h2>
      <p>
        L’équipe qui édite Teranga Santé (voir les <Link to="/mentions-legales">mentions légales</Link>). Contact pour tes données :{' '}
        <Mail to={LEGAL.privacyEmail} />. Le traitement relève de la loi sénégalaise n° 2008-12 du 25 janvier 2008 sur la protection
        des données à caractère personnel. Formalité auprès de la {LEGAL.authority.name} : <V v={LEGAL.cdpReference} />.
      </p>

      <h2>Ce que nous ne collectons pas</h2>
      <ul>
        <li>Ni nom, ni numéro de téléphone, ni email, ni date de naissance pour les jeunes.</li>
        <li>Ni ta position : elle sert seulement, sur ton téléphone, à trier les centres du plus proche au plus loin. Elle n’est jamais envoyée à nos serveurs.</li>
        <li>Ni ton suivi de traitement : le rappel et la plante restent sur ton téléphone.</li>
        <li>Aucun outil de mesure d’audience, aucune publicité, aucun traceur.</li>
      </ul>

      <h2>Les données que nous traitons</h2>
      {TREATMENTS.map((t) => (
        <section key={t.name} className="legal-block">
          <h3>{t.name}</h3>
          <dl>
            <dt>Données</dt><dd>{t.data}</dd>
            <dt>Pourquoi</dt><dd>{t.purpose}</dd>
            <dt>Base légale</dt><dd>{t.basis}</dd>
            <dt>Qui y a accès</dt><dd>{t.who}</dd>
          </dl>
        </section>
      ))}

      <h2>Combien de temps nous les gardons</h2>
      <table className="table legal-table">
        <thead><tr><th scope="col">Données</th><th scope="col">Durée</th></tr></thead>
        <tbody>{RETENTION.map((r) => <tr key={r.what}><td>{r.what}</td><td>{r.how}</td></tr>)}</tbody>
      </table>
      <p>Une suppression automatique est exécutée chaque jour pour appliquer ces durées.</p>

      <h2>Nos prestataires et les transferts hors du Sénégal</h2>
      <table className="table legal-table">
        <thead><tr><th scope="col">Prestataire</th><th scope="col">Rôle</th><th scope="col">Pays</th></tr></thead>
        <tbody>
          <tr><td>{LEGAL.dataHost.name}</td><td>Hébergement de la base de données, des comptes et des messages vocaux</td><td><V v={LEGAL.dataHost.location} /></td></tr>
          <tr><td>Groq, Inc.</td><td>Réponses de l’assistant Baobi et transcription des questions vocales</td><td>États-Unis</td></tr>
          <tr><td>Google (API Gemini)</td><td>Propositions de questions pour le jeu, à partir d’un thème choisi par une infirmière. Aucune donnée personnelle n’est envoyée.</td><td>États-Unis</td></tr>
          <tr><td>Fondation OpenStreetMap</td><td>Fond de la carte des centres dans l’application : ton téléphone télécharge les images de la zone affichée, ce qui transmet ton adresse IP</td><td>Royaume-Uni</td></tr>
          <tr><td><V v={LEGAL.siteHost.name} /></td><td>Hébergement du site web</td><td><mark>[À COMPLÉTER : pays]</mark></td></tr>
        </tbody>
      </table>
      <p>
        Ces pays sont situés hors du Sénégal. Conformément à la loi n° 2008-12, ces transferts sont encadrés par{' '}
        <mark>[À COMPLÉTER : autorisation de la CDP et/ou garanties contractuelles des prestataires]</mark>. Si tu touches
        « Itinéraire », l’application ouvre l’application de cartes de ton téléphone (Google Maps sur iPhone) : ce service
        reçoit alors directement la destination.
      </p>

      <h2>Sécurité</h2>
      <p>
        Connexions chiffrées, accès limités par rôle et par centre directement dans la base de données, messages vocaux dans un espace
        privé, mots de passe chiffrés, mot de passe provisoire à changer à la première connexion, journal des actions sensibles.
      </p>

      <h2>Tes droits</h2>
      <p>Tu peux à tout moment :</p>
      <ul>
        <li><strong>être informé</strong> et <strong>accéder</strong> à tes données ;</li>
        <li>les faire <strong>rectifier</strong> ;</li>
        <li>les faire <strong>supprimer</strong> ;</li>
        <li><strong>t’opposer</strong> à leur traitement pour un motif légitime ;</li>
        <li><strong>retirer ton consentement</strong>, sans que cela remette en cause ce qui a été fait avant.</li>
      </ul>
      <p>
        <strong>Le plus simple : dans l’application, onglet « Moi » → « Effacer toutes mes données ».</strong> Tout est supprimé
        immédiatement : profil, rendez-vous, conversations et messages vocaux. Comme nous ne connaissons pas ton identité, c’est aussi
        le moyen le plus sûr.
      </p>
      <p>
        Sinon, écris à <Mail to={LEGAL.privacyEmail} /> en donnant ton code de rendez-vous si tu en as un : il nous permet de retrouver
        tes données sans te demander ton nom. Nous répondons dans un délai d’un mois.
      </p>
      <p>
        Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la {LEGAL.authority.name} :{' '}
        <a href={LEGAL.authority.url} rel="noopener noreferrer">{LEGAL.authority.url.replace('https://', '')}</a>.
      </p>

      <h2 id="cookies">Cookies et stockage local</h2>
      <p>
        Le site n’utilise <strong>aucun cookie publicitaire ni de mesure d’audience</strong> : c’est pourquoi aucun bandeau ne te
        demande ton accord. Seuls des éléments strictement nécessaires sont enregistrés dans ton navigateur, et uniquement si tu te
        connectes à l’espace professionnel :
      </p>
      <table className="table legal-table">
        <thead><tr><th scope="col">Élément</th><th scope="col">Émetteur</th><th scope="col">Rôle</th><th scope="col">Durée</th></tr></thead>
        <tbody>
          <tr><td>sb-…-auth-token</td><td>Teranga Santé (Supabase)</td><td>Garder la session ouverte</td><td>Jusqu’à la déconnexion ; fermeture de l’onglet si « Se souvenir de moi » est décoché</td></tr>
          <tr><td>ts.remember</td><td>Teranga Santé</td><td>Retenir le choix « Se souvenir de moi »</td><td>Jusqu’à ce que tu vides les données du navigateur</td></tr>
          <tr><td>ts.centre</td><td>Teranga Santé</td><td>Retenir le centre affiché (super administrateur)</td><td>Jusqu’à ce que tu vides les données du navigateur</td></tr>
        </tbody>
      </table>
      <p>
        Dans l’application, ton profil, tes codes de rendez-vous et tes réglages sont enregistrés sur ton téléphone. Ils sont effacés
        avec « Effacer toutes mes données » ou en désinstallant l’application.
      </p>

      <h2>Âge</h2>
      <p>Teranga Santé s’adresse aux personnes de 18 à 35 ans. Si tu as moins de 18 ans, parle à un professionnel de santé ou à un adulte de confiance.</p>

      <h2>Modifications</h2>
      <p>Si cette politique change de façon importante, l’application te le signalera. La date de mise à jour figure en haut de la page.</p>
    </LegalPage>
  );
}

/* ------------------------------------------------------------------ Conditions générales d'utilisation */
export function Cgu() {
  return (
    <LegalPage title="Conditions d’utilisation" description="Les règles d’utilisation de l’application Teranga Santé, du site et de l’espace professionnel.">
      <p className="small muted">Version {LEGAL.termsVersion}</p>

      <h2>1. Objet</h2>
      <p>
        Ces conditions encadrent l’utilisation gratuite de Teranga Santé : l’application mobile, le site web et l’espace
        professionnel. Elles sont acceptées en cochant la case prévue à la création du profil dans l’application, ou à la première
        connexion à l’espace professionnel.
      </p>

      <h2>2. Ce que Teranga Santé est, et n’est pas</h2>
      <ul>
        <li>Un service d’information, de prise de rendez-vous et de mise en relation avec des infirmières des centres partenaires.</li>
        <li><strong>Pas un service d’urgence</strong> : en cas de danger immédiat, appelle le SAMU au 1515. Après un rapport à risque datant de moins de 72 heures, rends-toi tout de suite dans un centre de santé.</li>
        <li><strong>Pas un diagnostic</strong> : seul un test permet de connaître son statut VIH. L’assistant Baobi est une intelligence artificielle : ses réponses sont générales, peuvent contenir des erreurs et ne remplacent pas l’avis d’un professionnel.</li>
      </ul>

      <h2>3. Accès</h2>
      <h3>Jeunes</h3>
      <p>
        L’application est destinée aux personnes de <strong>18 à 35 ans</strong>. Elle fonctionne sans compte nominatif : un pseudo
        suffit. Ton profil est lié à ton téléphone ; si tu changes de téléphone ou désinstalles l’application, il est perdu.
      </p>
      <h3>Professionnels</h3>
      <p>
        L’espace professionnel est réservé aux personnes dont le compte a été créé par un responsable de centre ou par le super
        administrateur. Le mot de passe provisoire doit être remplacé à la première connexion. Les identifiants sont personnels et ne
        doivent jamais être partagés.
      </p>

      <h2>4. Règles d’utilisation</h2>
      <p>Il est interdit :</p>
      <ul>
        <li>d’insulter, de menacer, de harceler ou de discriminer qui que ce soit ;</li>
        <li>de publier des informations permettant d’identifier une autre personne, notamment sur sa santé ;</li>
        <li>de réserver des créneaux sans intention de venir, ou de perturber le service de toute autre manière ;</li>
        <li>de tenter d’accéder à des données qui ne te sont pas destinées ou de contourner les protections du service.</li>
      </ul>
      <h3>Engagements des professionnels</h3>
      <ul>
        <li>Respecter le secret professionnel et la confidentialité des échanges.</li>
        <li>Ne jamais demander l’identité, le numéro ou l’adresse d’un jeune dans la messagerie.</li>
        <li>N’indiquer qu’un numéro de téléphone professionnel.</li>
        <li>Relire et valider tout contenu avant sa publication, y compris les questions proposées par l’intelligence artificielle.</li>
        <li>Ne consulter que les données nécessaires à leur mission. Les accès sont tracés.</li>
      </ul>

      <h2>5. Rendez-vous</h2>
      <p>
        Le code de rendez-vous est personnel : présente-le à l’accueil du centre. Si tu ne peux pas venir, préviens l’infirmière dans
        l’application pour libérer la place. Le centre peut être amené à reporter ou annuler un créneau ; garde un œil sur ta discussion avec l’infirmière.
      </p>

      <h2>6. Contenus</h2>
      <p>
        Le nom, le logo, la mascotte Baobi, les textes et les illustrations sont protégés : tu peux les consulter et les partager pour
        un usage personnel, mais pas les reproduire à d’autres fins sans autorisation. Les professionnels qui rédigent des fiches
        autorisent leur publication sur le site et dans l’application pendant toute la durée du projet.
      </p>

      <h2>7. Fin d’utilisation</h2>
      <p>
        Tu peux arrêter à tout moment : « Moi » → « Effacer toutes mes données » supprime immédiatement ton profil, tes rendez-vous et
        tes conversations. En cas de manquement grave à ces conditions, un compte peut être suspendu ou supprimé. Le compte d’un
        professionnel est désactivé quand il quitte ses fonctions. Les durées de conservation sont indiquées dans la{' '}
        <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>8. Disponibilité et responsabilité</h2>
      <p>
        Teranga Santé est un projet gratuit, en phase de prototype. Nous faisons de notre mieux pour qu’il fonctionne en
        permanence, mais il peut être interrompu, notamment pour maintenance, et sans garantie de disponibilité. L’équipe ne peut pas
        être tenue responsable d’une décision de santé prise sur la seule base des informations du service, ni d’une interruption
        indépendante de sa volonté. Chaque professionnel reste responsable des actes et conseils qu’il délivre.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Ces conditions peuvent évoluer. En cas de changement important, une nouvelle acceptation te sera demandée dans l’application ou
        à ta prochaine connexion.
      </p>

      <h2>10. Droit applicable et contact</h2>
      <p>
        Ces conditions sont soumises au droit sénégalais. En cas de litige, une solution amiable sera recherchée en priorité ; à
        défaut, les juridictions sénégalaises compétentes seront saisies. Contact : <Mail to={LEGAL.email} />.
      </p>
    </LegalPage>
  );
}
