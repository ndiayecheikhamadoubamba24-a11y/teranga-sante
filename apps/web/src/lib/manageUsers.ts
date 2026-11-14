import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from './supabase';

const NOT_DEPLOYED =
  'La fonction serveur « manage-users » est introuvable : elle n’est pas encore déployée sur Supabase ' +
  '(Dashboard → Edge Functions → nouvelle fonction « manage-users », voir le README).';

/** Appel de la fonction Edge (clé service côté serveur uniquement). */
export async function manageUsers<T = { ok: boolean }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (!error) return data as T;

  // Fonction absente ou injoignable (non déployée, mauvais nom, coupure réseau).
  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) throw new Error(NOT_DEPLOYED);

  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    if (res.status === 404) throw new Error(NOT_DEPLOYED);
    let msg = `Erreur serveur (${res.status})`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {}
    // Fonction déployée mais base pas à jour (migration du mot de passe provisoire non exécutée).
    if (/mark_temp_password|must_change_password/.test(msg)) msg = 'Base de données pas à jour : exécute la migration 20261118000000_temp_password.sql.';
    throw new Error(msg);
  }
  throw new Error(error.message);
}
