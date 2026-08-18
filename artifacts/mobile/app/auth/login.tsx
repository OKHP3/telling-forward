import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSignIn } from '@clerk/expo/legacy';
import { useSSO } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';

// Required for the OAuth redirect to complete inside the app.
WebBrowser.maybeCompleteAuthSession();

// ---------------------------------------------------------------------------
// OAuth provider list
// ---------------------------------------------------------------------------

type OAuthStrategy =
  | 'oauth_github'
  | 'oauth_google'
  | 'oauth_apple'
  | 'oauth_facebook';

const OAUTH_PROVIDERS: { strategy: OAuthStrategy; label: string }[] = [
  { strategy: 'oauth_github', label: 'GitHub' },
  { strategy: 'oauth_google', label: 'Google' },
  { strategy: 'oauth_apple', label: 'Apple' },
  { strategy: 'oauth_facebook', label: 'Facebook' },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const colors = useColors();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Email + password sign-in
  // ---------------------------------------------------------------------------

  const handleLogin = async () => {
    if (!isLoaded || !signIn || !email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/narrate');
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { longMessage?: string; message?: string }[] })
        ?.errors?.[0];
      const msg =
        clerkErr?.longMessage ??
        clerkErr?.message ??
        (err instanceof Error ? err.message : 'Sign in failed');
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // OAuth sign-in
  // ---------------------------------------------------------------------------

  const handleOAuth = async (strategy: OAuthStrategy) => {
    setOauthLoading(strategy);
    setError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { createdSessionId, setActive: setActiveOAuth } = await startSSOFlow({
        strategy,
        redirectUrl,
      });
      if (createdSessionId && setActiveOAuth) {
        await setActiveOAuth({ session: createdSessionId });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/narrate');
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { longMessage?: string; message?: string }[] })
        ?.errors?.[0];
      const msg =
        clerkErr?.longMessage ??
        clerkErr?.message ??
        'OAuth sign in failed';
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setOauthLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const anyLoading = loading || oauthLoading !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Sign in',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
        }}
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === 'web' ? 34 : 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Text
          style={[styles.heading, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}
        >
          Welcome back
        </Text>
        <Text
          style={[
            styles.subheading,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Sign in to narrate and contribute to storyworlds.
        </Text>

        {/* Social sign-in */}
        <View style={styles.oauthGroup}>
          {OAUTH_PROVIDERS.map(({ strategy, label }) => (
            <TouchableOpacity
              key={strategy}
              style={[
                styles.oauthButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  opacity: anyLoading ? 0.6 : 1,
                },
              ]}
              onPress={() => handleOAuth(strategy)}
              disabled={anyLoading}
              activeOpacity={0.75}
            >
              {oauthLoading === strategy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.oauthText,
                    { color: colors.foreground, fontFamily: 'Inter_500Medium' },
                  ]}
                >
                  Continue with {label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text
            style={[
              styles.dividerText,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            or
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Error */}
        {error ? (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.destructive + '18',
                borderColor: colors.destructive + '44',
              },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                { color: colors.destructive, fontFamily: 'Inter_400Regular' },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* Email */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          EMAIL
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
          ]}
          placeholder="you@example.com"
          placeholderTextColor={colors.mutedForeground}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          editable={!anyLoading}
        />

        {/* Password */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          PASSWORD
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
          ]}
          placeholder="Your password"
          placeholderTextColor={colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          editable={!anyLoading}
        />

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: anyLoading ? colors.primary + 'AA' : colors.primary },
          ]}
          onPress={handleLogin}
          disabled={anyLoading || !isLoaded}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.submitText,
                { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' },
              ]}
            >
              Sign in
            </Text>
          )}
        </TouchableOpacity>

        {/* Switch to register */}
        <TouchableOpacity
          onPress={() => router.replace('/auth/register')}
          activeOpacity={0.75}
          style={styles.switchLink}
        >
          <Text
            style={[
              styles.switchText,
              { color: colors.primary, fontFamily: 'Inter_400Regular' },
            ]}
          >
            New to Telling Forward? Create an account
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, gap: 10 },
  heading: { fontSize: 28, marginBottom: 4 },
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  oauthGroup: { gap: 8, marginBottom: 4 },
  oauthButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
  },
  oauthText: { fontSize: 15 },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  errorBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 11, letterSpacing: 1, marginTop: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: { fontSize: 16 },
  switchLink: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  switchText: { fontSize: 14, textDecorationLine: 'underline' },
});
