import { Alert, Linking } from 'react-native';

/**
 * Appel téléphonique depuis l'app. Appeler révèle le numéro de la personne à son interlocuteur :
 * on le rappelle avant (l'anonymat est l'exigence n°1), en proposant d'écrire à la place.
 */
export function callWithWarning(who: string, phone: string, onWrite?: () => void) {
  const tel = `tel:${phone.replace(/[^\d+]/g, '')}`;
  Alert.alert(
    `Appeler ${who}`,
    `${phone}\n\nAttention : ton numéro sera visible par la personne que tu appelles. Pour rester anonyme, tu peux plutôt écrire dans l’application.`,
    [
      ...(onWrite ? [{ text: 'Écrire plutôt', onPress: onWrite }] : []),
      { text: 'Appeler', onPress: () => Linking.openURL(tel) },
      { text: 'Annuler', style: 'cancel' as const },
    ],
  );
}
