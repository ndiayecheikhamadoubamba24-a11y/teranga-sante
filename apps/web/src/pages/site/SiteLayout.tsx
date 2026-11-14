import { LogIn, Menu, Phone, UserRound, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Baobi } from '../../components/Baobi';
import { WaxBand } from '../../components/Decor';
import { HOME_BY_ROLE } from '../../components/Layout';
import { Logo } from '../../components/ui';
import { useAuth } from '../../lib/auth';

/** Mise en page publique du site vitrine (en-tête, pied de page). */
export function SiteLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { session, pro } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    document.title = title ? `${title} · Teranga Santé` : 'Teranga Santé — Ta santé, sans jugement';
  }, [title]);
  useEffect(() => {
    setOpen(false);
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  const loggedIn = !!(session && pro && !pro.must_change_password);

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-wrap site-header-row">
          <Link to="/" aria-label="Teranga Santé — accueil" className="site-logo"><Logo size={96} /></Link>
          <nav className={`site-nav ${open ? 'open' : ''}`} aria-label="Navigation du site">
            <NavLink to="/conseils">Conseils</NavLink>
            <NavLink to="/publications">Publications</NavLink>
            <Link to="/#application">L’application</Link>
            <Link to="/#professionnels">Professionnels</Link>
            {loggedIn ? (
              <Link to={HOME_BY_ROLE[pro!.role]} className="btn sm"><UserRound size={16} /> Mon espace</Link>
            ) : (
              <Link to="/connexion" className="btn sm"><LogIn size={16} /> Se connecter</Link>
            )}
          </nav>
          <button className="icon-btn site-burger" onClick={() => setOpen(!open)} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <WaxBand height={18} />
        <div className="site-wrap site-footer-grid">
          <div>
            <Logo size={110} light />
            <p className="small" style={{ opacity: 0.85, maxWidth: 300 }}>
              Une porte d’entrée ludique et confidentielle vers l’information, le dépistage et les soins pour les jeunes de 18 à 35 ans au Sénégal.
            </p>
          </div>
          <div>
            <strong>Le site</strong>
            <Link to="/conseils">Conseils santé</Link>
            <Link to="/publications">Publications</Link>
            <Link to="/#application">Installer l’application</Link>
            <Link to="/connexion">Espace professionnel</Link>
          </div>
          <div>
            <strong>Confidentialité</strong>
            <span>Aucun nom ni numéro demandé</span>
            <span>Réservations avec un code anonyme</span>
            <span>Aucune donnée de santé enregistrée</span>
          </div>
          <div>
            <strong>Urgence</strong>
            <a href="tel:1515" className="row" style={{ gap: 6 }}><Phone size={16} /> SAMU : 1515</a>
            <span className="small" style={{ opacity: 0.8 }}>En cas de danger immédiat, appelle les secours.</span>
            <div style={{ marginTop: 8 }}><Baobi size={54} mood="wave" /></div>
          </div>
        </div>
        <div className="site-wrap small" style={{ opacity: 0.7, padding: '12px 20px 24px' }}>
          © {new Date().getFullYear()} Teranga Santé · Projet Hack4VIH · Les informations du site ne remplacent pas l’avis d’un professionnel de santé.
        </div>
      </footer>
    </div>
  );
}
