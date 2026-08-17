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
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/narrate');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(
        msg.includes('409') || msg.includes('already')
          ? 'An account with this email already exists.'
          : msg,
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Create account',
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
          style={[
            styles.heading,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Join the story
        </Text>
        <Text
          style={[
            styles.subheading,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          No GitHub account needed. Just your voice and your story.
        </Text>

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

        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          YOUR NAME
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
          placeholder="How should we credit you?"
          placeholderTextColor={colors.mutedForeground}
          value={displayName}
          onChangeText={setDisplayName}
          returnKeyType="next"
          autoCorrect={false}
        />

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
        />

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
          placeholder="At least 8 characters"
          placeholderTextColor={colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: loading || !displayName || !email || !password ? 0.6 : 1,
            },
          ]}
          onPress={handleRegister}
          disabled={loading || !displayName || !email || !password}
          activeOpacity={0.85}
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
              Create account
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/auth/login')}
          activeOpacity={0.75}
          style={styles.switchLink}
        >
          <Text
            style={[
              styles.switchText,
              { color: colors.primary, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Already have an account? Sign in
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
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
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
