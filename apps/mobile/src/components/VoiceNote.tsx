import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { voiceUrl } from '../lib/chat';
import { colors, fonts } from '../theme';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Lecture d'un message vocal (URL signée, valable 1 h). */
export function VoiceNote({ path, mine, durationMs }: { path: string; mine: boolean; durationMs?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    voiceUrl(path).then(setUrl);
  }, [path]);
  const player = useAudioPlayer(url ? { uri: url } : null);
  const status = useAudioPlayerStatus(player);
  const total = status.duration || (durationMs ?? 0) / 1000;
  const progress = total ? Math.min(1, status.currentTime / total) : 0;
  const fg = mine ? colors.white : colors.green;

  const toggle = () => {
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish || (total && status.currentTime >= total - 0.1)) player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} disabled={!url} accessibilityLabel={status.playing ? 'Pause' : 'Écouter le message vocal'} style={[styles.btn, { backgroundColor: mine ? 'rgba(255,255,255,0.25)' : colors.greenLight }]}>
        {!url ? <ActivityIndicator size="small" color={fg} /> : <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={fg} />}
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: fg }]} />
      </View>
      <Text style={[styles.time, { color: mine ? colors.white : colors.night }]}>{fmt(status.playing ? status.currentTime : total)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 180 },
  btn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', overflow: 'hidden' },
  fill: { height: '100%' },
  time: { fontFamily: fonts.semibold, fontSize: 12 },
});
