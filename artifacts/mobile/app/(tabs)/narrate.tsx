/**
 * Narrate tab — voice-first contribution drafting.
 *
 * The contributor taps the microphone, speaks their scene, and the transcribed
 * text pre-fills a draft. They can edit the draft and save it locally. Once the
 * GitHub sync layer is live, the draft can be submitted as a proposed path.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

const DRAFT_KEY = 'tf_narration_draft';

export default function NarrateScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);

  const handleTranscript = useCallback((text: string) => {
    setBody((prev) => (prev ? prev + '\n\n' + text : text));
    setSaved(false);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() && !body.trim()) return;
    try {
      const draft = JSON.stringify({ title: title.trim(), body: body.trim(), savedAt: new Date().toISOString() });
      await AsyncStorage.setItem(DRAFT_KEY, draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch {
      // ignore
    }
  }, [title, body]);

  const handleClear = useCallback(() => {
    if (!title && !body) return;
    Alert.alert('Clear draft', 'Discard this narration?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          setTitle('');
          setBody('');
          setSaved(false);
        },
      },
    ]);
  }, [title, body]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 67 : 0 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Narrate
          </Text>
        </View>
        <View style={styles.authGate}>
          <Feather name="mic-off" size={44} color={colors.mutedForeground} />
          <Text style={[styles.authTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Sign in to narrate
          </Text>
          <Text style={[styles.authSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Create an account to start contributing your voice to the story.
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.signInText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
              Sign in
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.75}
          >
            <Text style={[styles.registerLink, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
              Create account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
            paddingTop: Platform.OS === 'web' ? 67 : 0,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Narrate
        </Text>
        <Text
          style={[
            styles.headerSub,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Speak your scene into existence
        </Text>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === 'web' ? 34 : 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        {/* Voice recorder */}
        <View
          style={[
            styles.recorderCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <VoiceRecorder onTranscript={handleTranscript} />
        </View>

        {/* Title input */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          TITLE
        </Text>
        <TextInput
          style={[
            styles.titleInput,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: 'Inter_600SemiBold',
            },
          ]}
          placeholder="Give this scene a title"
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={(t) => { setTitle(t); setSaved(false); }}
          returnKeyType="next"
        />

        {/* Body textarea */}
        <Text
          style={[
            styles.label,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          NARRATION
        </Text>
        <TextInput
          style={[
            styles.bodyInput,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: 'Inter_400Regular',
            },
          ]}
          placeholder="Your narration will appear here after recording. You can also type directly."
          placeholderTextColor={colors.mutedForeground}
          value={body}
          onChangeText={(t) => { setBody(t); setSaved(false); }}
          multiline
          textAlignVertical="top"
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: saved ? colors.muted : colors.primary,
                opacity: !title.trim() && !body.trim() ? 0.4 : 1,
              },
            ]}
            onPress={handleSaveDraft}
            disabled={!title.trim() && !body.trim()}
            activeOpacity={0.85}
          >
            <Feather
              name={saved ? 'check' : 'save'}
              size={18}
              color={saved ? colors.mutedForeground : colors.primaryForeground}
            />
            <Text
              style={[
                styles.saveText,
                {
                  color: saved ? colors.mutedForeground : colors.primaryForeground,
                  fontFamily: 'Inter_600SemiBold',
                },
              ]}
            >
              {saved ? 'Draft saved' : 'Save draft'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearButton, { borderColor: colors.border }]}
            onPress={handleClear}
            activeOpacity={0.75}
          >
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>

        {saved ? (
          <Text
            style={[
              styles.savedNote,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Draft saved on this device. Submitting to a storyworld will be available once the contribution flow is live.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 26, marginBottom: 2 },
  headerSub: { fontSize: 13 },
  content: { padding: 16, gap: 10 },
  recorderCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  titleInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  bodyInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 140,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveText: { fontSize: 15 },
  clearButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedNote: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  // Unauthenticated state
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  authTitle: { fontSize: 20, textAlign: 'center' },
  authSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  signInButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  signInText: { fontSize: 16 },
  registerLink: { fontSize: 14, textDecorationLine: 'underline' },
});
