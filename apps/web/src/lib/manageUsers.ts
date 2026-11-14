import { supabase } from './supabase';

/** Appel de la fonction Edge (clé service côté serveur uniquement). */
export async function manageUsers<T = { ok: boolean }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-users', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) msg = (await ctx.json()).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return data as T;
}
