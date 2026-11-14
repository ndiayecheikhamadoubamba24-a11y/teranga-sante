import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useStore } from '../../lib/store';
import { colors, fonts } from '../../theme';

export default function TabsLayout() {
  const { t } = useStore();
  const icon = (name: keyof typeof Ionicons.glyphMap) =>
    ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size + 2} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.night,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 64, paddingTop: 6 },
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen name="accueil" options={{ title: t('home'), tabBarIcon: icon('home') }} />
      <Tabs.Screen name="jeux" options={{ title: t('games'), tabBarIcon: icon('game-controller') }} />
      <Tabs.Screen name="carte" options={{ title: t('map'), tabBarIcon: icon('location') }} />
      <Tabs.Screen name="moi" options={{ title: t('me'), tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
