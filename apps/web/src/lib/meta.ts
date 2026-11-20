import { useEffect } from 'react';

// Métadonnées par page (titre, description, URL canonique, Open Graph) pour les moteurs et les agents IA.
// VITE_SITE_URL = adresse publique du site (ex. https://teranga-sante.sn) ; à défaut, l'adresse courante.
export const SITE_URL = (import.meta.env.VITE_SITE_URL?.trim() || window.location.origin).replace(/\/$/, '');
export const DEFAULT_TITLE = 'Teranga Santé — Ta santé, sans jugement';
export const DEFAULT_DESCRIPTION =
  'Informe-toi sur le VIH et les IST, trouve un centre de dépistage, réserve avec un code sans donner ton nom et discute avec une infirmière. Gratuit, pour les 18-35 ans au Sénégal.';

function setTag(selector: string, attr: 'name' | 'property' | 'rel', key: string, value: string, valueAttr = 'content') {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement(attr === 'rel' ? 'link' : 'meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute(valueAttr, value);
}

export function useMeta({ title, description, path, type = 'website', noindex = false }: { title?: string; description?: string; path?: string; type?: string; noindex?: boolean }) {
  useEffect(() => {
    const t = title ? `${title} · Teranga Santé` : DEFAULT_TITLE;
    const d = description ?? DEFAULT_DESCRIPTION;
    const url = SITE_URL + (path ?? window.location.pathname);
    document.title = t;
    setTag('meta[name="description"]', 'name', 'description', d);
    setTag('link[rel="canonical"]', 'rel', 'canonical', url, 'href');
    setTag('meta[property="og:title"]', 'property', 'og:title', t);
    setTag('meta[property="og:description"]', 'property', 'og:description', d);
    setTag('meta[property="og:url"]', 'property', 'og:url', url);
    setTag('meta[property="og:type"]', 'property', 'og:type', type);
    setTag('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, path, type, noindex]);
}

/** Données structurées JSON-LD propres à la page (ex. Article), retirées en quittant la page. */
export function useJsonLd(data: object | null) {
  const json = data ? JSON.stringify(data) : null;
  useEffect(() => {
    if (!json) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.dataset.page = '1';
    el.textContent = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [json]);
}
