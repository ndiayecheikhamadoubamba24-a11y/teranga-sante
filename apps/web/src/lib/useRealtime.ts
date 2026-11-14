import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

type Change = { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: Record<string, unknown>; old: Record<string, unknown> };

/** Abonnement temps réel Postgres (respecte les règles RLS). */
export function useRealtime(table: string, onChange: (c: Change) => void, filter?: string, enabled = true) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(`rt-${table}-${filter ?? 'all'}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, (p) =>
        cb.current({ eventType: p.eventType as Change['eventType'], new: p.new as Record<string, unknown>, old: p.old as Record<string, unknown> }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, filter, enabled]);
}
