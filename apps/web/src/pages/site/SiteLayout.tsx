import { LogIn, Mail, Menu, Phone, UserRound, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { WaxBand } from '../../components/Decor';
import { HOME_BY_ROLE } from '../../components/Layout';
import { LogoInline } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { LEGAL } from '../../lib/legal';
import { useMeta } from '../../lib/meta';

/** Mise en page publique du site vitrine (en-tête, pied de page). */
export function SiteLayout({ children, title, description, type, noindex }: { children: ReactNode; title?: string; description?: string; type?: string; noindex?: boolean }) {
  const { session, pro } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useMeta({ title, description, type, noindex });
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
          <Link to="/" aria-label="Teranga Santé — accueil" className="site-logo"><LogoInline height={42} /></Link>
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
            <LogoInline height={48} light />
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
            <strong>Informations légales</strong>
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/confidentialite#cookies">Cookies</Link>
            <Link to="/cgu">Conditions d’utilisation</Link>
            {LEGAL.email.startsWith('[')
              ? <span className="row" style={{ gap: 6 }}><Mail size={16} aria-hidden="true" /> <mark>{LEGAL.email}</mark></span>
              : <a href={`mailto:${LEGAL.email}`} className="row" style={{ gap: 6 }}><Mail size={16} aria-hidden="true" /> {LEGAL.email}</a>}
          </div>
          <div>
            <strong>Urgence</strong>
            <a href="tel:1515" className="row" style={{ gap: 6 }}><Phone size={16} aria-hidden="true" /> SAMU : 1515</a>
            <span className="small" style={{ opacity: 0.8 }}>En cas de danger immédiat, appelle les secours.</span>
          </div>
        </div>
        <div className="site-wrap small" style={{ opacity: 0.7, padding: '12px 20px 24px' }}>
          © {new Date().getFullYear()} Teranga Santé · Projet Hack4VIH · Les informations du site ne remplacent pas l’avis d’un professionnel de santé.
        </div>
      </footer>
    </div>
  );
}
