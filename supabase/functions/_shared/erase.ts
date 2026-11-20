// Effacement complet d'un compte de jeune : messages vocaux (stockage), puis compte d'authentification.
// La suppression du compte efface par cascade : profil (players), rendez-vous, conversations, messages,
// compteur IA. Les signalements éventuels sont conservés sans lien avec la personne (player_id → null).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

/** Supprime tous les fichiers d'un dossier du bucket privé « voice » (un dossier = une conversation). */
export async function removeVoiceFolder(admin: SupabaseClient, folder: string) {
  for (;;) {
    const { data, error } = await admin.storage.from('voice').list(folder, { limit: 100 });
    if (error) throw error;
    if (!data?.length) return;
    const { error: rmError } = await admin.storage.from('voice').remove(data.map((f) => `${folder}/${f.name}`));
    if (rmError) throw rmError;
    if (data.length < 100) return;
  }
}

export async function eraseYouthAccount(admin: SupabaseClient, userId: string) {
  // Un compte professionnel ne s'efface pas ainsi : il est géré par le centre ou le super administrateur.
  const { data: pro } = await admin.from('pros').select('id').eq('id', userId).maybeSingle();
  if (pro) throw new Error('compte professionnel');
  const { data: convs, error } = await admin.rpc('conversations_of', { p_user: userId });
  if (error) throw error;
  for (const id of (convs ?? []) as string[]) await removeVoiceFolder(admin, id);
  const { error: delError } = await admin.auth.admin.deleteUser(userId);
  if (delError) throw delError;
}
