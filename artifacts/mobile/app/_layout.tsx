import React, { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { setBaseUrl } from '@workspace/api-client-react';
import { AuthProvider } from '@/context/AuthContext';

// Configure the base URL for all API calls.
// Expo bundles run outside the shared web proxy and need absolute URLs.
if (process.env['EXPO_PUBLIC_DOMAIN']) {
  setBaseUrl(`https://${process.env['EXPO_PUBLIC_DOMAIN']}`);
}

SplashScreen.preventAutoHideAsync();

const STORY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  }),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      gcTime: STORY_CACHE_MAX_AGE,
      networkMode: 'offlineFirst',
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'telling-forward-story-cache',
});

const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: STORY_CACHE_MAX_AGE,
  buster: 'telling-forward-story-cache-v2',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: {
      queryKey: readonly unknown[];
      state: { status: string };
    }) => {
      const [queryPath] = query.queryKey;
      return (
        query.state.status === 'success' &&
        typeof queryPath === 'string' &&
        queryPath.startsWith('/api/storyworlds')
      );
    },
  },
};

function RootLayoutNav() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="storyworld/[id]"
        options={{ headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="path/[id]"
        options={{ headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="auth/login"
        options={{ presentation: 'modal', headerBackTitle: 'Cancel' }}
      />
      <Stack.Screen
        name="auth/register"
        options={{ presentation: 'modal', headerBackTitle: 'Cancel' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
