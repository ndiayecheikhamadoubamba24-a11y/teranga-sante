import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

type CentreRow = { id: string; name: string; region_id: number };
type CentreCtx = { centreId: string | null; centreName: string; centres: CentreRow[]; setCentreId: (id: string) => void; canSwitch: boolean; reload: () => void };

const Ctx = createContext<CentreCtx | null>(null);
const KEY = 'ts.centre';

/**
 * Centre « actif » des pages Agenda, Rendez-vous, Centre et Stocks.
 * Infirmière / responsable : toujours leur propre centre. Super admin : centre choisi dans l'en-tête.
 */
export function CentreProvider({ children }: { children: ReactNode }) {
  const { pro } = useAuth();
  const canSwitch = pro?.role === 'super_admin';
  const [centres, setCentres] = useState<CentreRow[]>([]);
  const [selected, setSelected] = useState<string | null>(() => localStorage.getItem(KEY));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!canSwitch) return;
    supabase.from('centres').select('id, name, region_id').order('name').then(({ data }) => setCentres((data as CentreRow[]) ?? []));
  }, [canSwitch, tick]);

  const value: CentreCtx = canSwitch
    ? (() => {
        const current = centres.find((c) => c.id === selected) ?? centres[0] ?? null;
        return {
          centreId: current?.id ?? null,
          centreName: current?.name ?? 'Aucun centre',
          centres,
          canSwitch,
          reload: () => setTick((t) => t + 1),
          setCentreId: (id: string) => {
            localStorage.setItem(KEY, id);
            setSelected(id);
          },
        };
      })()
    : { centreId: pro?.centre_id ?? null, centreName: pro?.centre?.name ?? 'Mon centre', centres: [], canSwitch: false, setCentreId: () => {}, reload: () => {} };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCentre() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCentre hors CentreProvider');
  return v;
}

/** Garantit un centre actif (sinon message). */
export function useCentreId(): string {
  const { centreId } = useCentre();
  if (!centreId) throw new Error('aucun centre');
  return centreId;
}
