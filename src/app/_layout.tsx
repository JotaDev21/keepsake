import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LightboxProvider, LockOverlay } from '@/components';
import { ThemeProvider, fontMap, useAccent, useTheme } from '@/design';
import { authenticate } from '@/lib/auth';
import { syncReminders } from '@/lib/notifications';
import { prefs } from '@/lib/prefs';
import { usePersonStore } from '@/stores/usePersonStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontMap);
  const hydrated = usePersonStore((s) => s.hydrated);
  const hydrate = usePersonStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const ready = fontsLoaded && hydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemedRoot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Seeds the theme from the person's accent (read outside the theme). */
function ThemedRoot() {
  const accent = usePersonStore((s) => s.person?.accent);
  return (
    <ThemeProvider initialAccent={accent}>
      <ThemedNavigator />
    </ThemeProvider>
  );
}

function ThemedNavigator() {
  const theme = useTheme();
  const { setAccent } = useAccent();
  const accent = usePersonStore((s) => s.person?.accent);
  const personId = usePersonStore((s) => s.person?.id);
  const hasPerson = usePersonStore((s) => s.person != null);

  const [locked, setLocked] = useState(() => prefs.isAppLockEnabled());

  // Keep the whole app re-tinted as the person's accent changes.
  useEffect(() => {
    if (accent) setAccent(accent);
  }, [accent, setAccent]);

  // Schedule gentle local reminders (check-in, dates, capsules) once we have a person.
  useEffect(() => {
    if (personId) syncReminders(personId).catch(() => {});
  }, [personId]);

  const unlock = useCallback(async () => {
    const ok = await authenticate();
    if (ok) setLocked(false);
  }, []);

  // Prompt for biometrics immediately if the app opened locked.
  useEffect(() => {
    if (prefs.isAppLockEnabled()) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-lock whenever the app is backgrounded (if the lock is on).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && prefs.isAppLockEnabled()) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <LightboxProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Protected guard={hasPerson}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="memoria/[id]" />
            <Stack.Screen name="carta/[id]" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="editar-perfil" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="gravar-audio" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="cartas/index" />
            <Stack.Screen name="cartas/escrever" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ajustes" options={{ animation: 'slide_from_bottom' }} />
          </Stack.Protected>
          <Stack.Protected guard={!hasPerson}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
      </LightboxProvider>
      {locked ? <LockOverlay onUnlock={unlock} /> : null}
    </>
  );
}
