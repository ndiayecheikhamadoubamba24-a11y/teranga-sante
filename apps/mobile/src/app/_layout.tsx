import {
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, useFonts,
} from '@expo-google-fonts/poppins';
import { Accelerometer } from 'expo-sensors';
import { DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { StoreProvider, useStore } from '../lib/store';
import { colors } from '../theme';

// M13 : secouer le téléphone ouvre immédiatement le faux écran météo.
function ShakeToHide() {
  const { settings, ready } = useStore();
  const pathname = usePathname();
  const last = useRef(0);
  const path = useRef(pathname);
  path.current = pathname;

  useEffect(() => {
    if (!ready || !settings.shakeToHide || Platform.OS === 'web') return;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (g > 2.3 && now - last.current > 1500 && path.current !== '/discret') {
        last.current = now;
        router.push('/discret');
      }
    });
    return () => sub.remove();
  }, [ready, settings.shakeToHide]);
  return null;
}

// Thème de navigation transparent : l'arrière-plan choisi apparaît derrière chaque écran.
const NAV_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: 'transparent', card: colors.white } };

export default function RootLayout() {
  const [loaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold });
  if (!loaded) return null;
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <ShakeToHide />
      <AppBackground>
      <ThemeProvider value={NAV_THEME}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' }, animation: 'slide_from_right' }}>
        <Stack.Screen name="discret" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="resultat" options={{ animation: 'fade' }} />
      </Stack>
      </ThemeProvider>
      </AppBackground>
    </StoreProvider>
  );
}
