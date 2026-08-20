/**
 * Narrate tab — voice-first contribution drafting.
 *
 * The contributor taps the microphone, speaks their scene, and the transcribed
 * text pre-fills a draft. They can edit the draft and save it locally. Once the
 * GitHub sync layer is live, the draft can be submitted as a proposed path.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListContributionsQueryKey,
  getListStoryPathsQueryKey,
  getListStoryworldsQueryKey,
  useCreateContribution,
  useListStoryPaths,
  useListStoryworlds,
} from '@workspace/api-client-react';

const DRAFT_KEY = 'tf_narration_draft';

type NarrationDraft = {
  title: string;
  body: string;
  savedAt: string;
  submissionId?: string;
  storyworldId?: number | null;
  pathId?: number | null;
};

export default function NarrateScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const [showSubmitSheet, setShowSubmitSheet] = useState(false);
  const [selectedStoryworldId, setSelectedStoryworldId] = useState<number | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const draftRestored = useRef(false);

  const { data: storyworlds, isLoading: storyworldsLoading } = useListStoryworlds({
    query: { enabled: showSubmitSheet, queryKey: getListStoryworldsQueryKey() },
  });
  const { data: paths, isLoading: pathsLoading } = useListStoryPaths(
    selectedStoryworldId ?? 0,
    {
      query: {
        enabled: showSubmitSheet && selectedStoryworldId !== null,
        queryKey: getListStoryPathsQueryKey(selectedStoryworldId ?? 0),
      },
    },
  );
  const submitMutation = useCreateContribution();
  const submitErrorMessage =
    submitMutation.error?.status === 409
      ? 'This path is no longer accepting submissions'
      : 'We couldn’t submit this scene. Check your connection and try again.';

  const persistDraft = useCallback(
    async (
      nextSubmissionId = submissionId,
      nextStoryworldId = selectedStoryworldId,
      nextPathId = selectedPathId,
    ) => {
      if (!title.trim() && !body.trim()) return;
      const draft: NarrationDraft = {
        title: title.trim(),
        body: body.trim(),
        savedAt: new Date().toISOString(),
        ...(nextSubmissionId ? { submissionId: nextSubmissionId } : {}),
        storyworldId: nextStoryworldId,
        pathId: nextPathId,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    },
    [title, body, submissionId, selectedStoryworldId, selectedPathId],
  );

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(DRAFT_KEY);
        if (stored) {
          const draft = JSON.parse(stored) as Partial<NarrationDraft>;
          if (typeof draft.title === 'string') setTitle(draft.title);
          if (typeof draft.body === 'string') setBody(draft.body);
          if (typeof draft.submissionId === 'string') setSubmissionId(draft.submissionId);
          if (typeof draft.storyworldId === 'number') setSelectedStoryworldId(draft.storyworldId);
          if (typeof draft.pathId === 'number') setSelectedPathId(draft.pathId);
          setSaved(true);
        }
      } catch {
        // A malformed local draft should not block narrating a new scene.
      } finally {
        draftRestored.current = true;
      }
    })();
  }, []);

  // A pending submission is a durable retry operation, not merely UI state.
  // Keep its key and target with the draft across navigation/app restarts.
  useEffect(() => {
    if (!draftRestored.current || !submissionId) return;
    void persistDraft().catch(() => {});
  }, [submissionId, selectedStoryworldId, selectedPathId, persistDraft]);

  const handleTranscript = useCallback((text: string) => {
    setBody((prev) => (prev ? prev + '\n\n' + text : text));
    setSaved(false);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() && !body.trim()) return;
    try {
      await persistDraft();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch {
      // ignore
    }
  }, [title, body, persistDraft]);

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
            setSubmissionId(null);
            setSelectedStoryworldId(null);
            setSelectedPathId(null);
            void AsyncStorage.removeItem(DRAFT_KEY);
        },
      },
    ]);
  }, [title, body]);

  const handleOpenSubmitSheet = useCallback(async () => {
    const nextSubmissionId = submissionId ?? Crypto.randomUUID();
    setSubmissionId(nextSubmissionId);
    await persistDraft(nextSubmissionId);
    submitMutation.reset();
    setShowSubmitSheet(true);
  }, [submissionId, persistDraft, submitMutation]);

  const handleSelectStoryworld = useCallback((storyworldId: number) => {
    setSelectedStoryworldId(storyworldId);
    setSelectedPathId(null);
    void persistDraft(submissionId, storyworldId, null).catch(() => {});
  }, [submissionId, persistDraft]);

  const handleSubmit = useCallback(() => {
    if (
      selectedStoryworldId === null ||
      selectedPathId === null ||
      submissionId === null ||
      !title.trim() ||
      !body.trim()
    ) {
      return;
    }

    const submittedStoryworldId = selectedStoryworldId;
    const submittedPathId = selectedPathId;
    const submittedPath = paths?.find((path) => path.id === submittedPathId);

    submitMutation.mutate(
      {
        id: submittedStoryworldId,
        pathId: submittedPathId,
        data: {
          title: title.trim(),
          content: body.trim(),
          submissionId,
        },
      },
      {
        onSuccess: async () => {
          await AsyncStorage.removeItem(DRAFT_KEY);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await queryClient.invalidateQueries({
            queryKey: getListContributionsQueryKey(
              submittedStoryworldId,
              submittedPathId,
            ),
          });
          setTitle('');
          setBody('');
          setSaved(false);
          setSubmissionId(null);
          setSelectedStoryworldId(null);
          setSelectedPathId(null);
          setShowSubmitSheet(false);
          Alert.alert(
            'Scene submitted',
            'Your narration is now visible on the story path.',
            [
              {
                text: 'View path',
                onPress: () =>
                  router.push({
                    pathname: '/path/[id]',
                    params: {
                      id: submittedPathId,
                      storyworldId: submittedStoryworldId,
                      title: submittedPath?.title ?? 'Story Path',
                    },
                  }),
              },
              { text: 'Done', style: 'cancel' },
            ],
          );
        },
      },
    );
  }, [
    selectedStoryworldId,
    selectedPathId,
    submissionId,
    title,
    body,
    paths,
    submitMutation,
    queryClient,
  ]);

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

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.accent,
              opacity: !title.trim() || !body.trim() ? 0.4 : 1,
            },
          ]}
          onPress={handleOpenSubmitSheet}
          disabled={!title.trim() || !body.trim()}
          activeOpacity={0.85}
        >
          <Feather name="send" size={18} color={colors.primaryForeground} />
          <Text
            style={[
              styles.submitText,
              { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            Submit to storyworld
          </Text>
        </TouchableOpacity>

        {saved ? (
          <Text
            style={[
              styles.savedNote,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Draft saved on this device. You can submit it to an open story path whenever you’re ready.
          </Text>
        ) : null}
      </KeyboardAwareScrollView>

      <Modal
        visible={showSubmitSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSubmitSheet(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.background + 'CC' }]}>
          <View style={[styles.submitSheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                  Submit your scene
                </Text>
                <Text style={[styles.sheetSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  Choose an open story path.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSubmitSheet(false)}
                accessibilityLabel="Close submit sheet"
                activeOpacity={0.75}
              >
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.sheetLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                STORYWORLD
              </Text>
              {storyworldsLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : storyworlds?.length ? (
                storyworlds.map((storyworld) => (
                  <TouchableOpacity
                    key={storyworld.id}
                    style={[
                      styles.choice,
                      {
                        backgroundColor:
                          selectedStoryworldId === storyworld.id
                            ? colors.primary + '18'
                            : colors.card,
                        borderColor:
                          selectedStoryworldId === storyworld.id
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectStoryworld(storyworld.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.choiceText}>
                      <Text style={[styles.choiceTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                        {storyworld.title}
                      </Text>
                      <Text style={[styles.choiceSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                        {storyworld.repoOwner}/{storyworld.repoName}
                      </Text>
                    </View>
                    {selectedStoryworldId === storyworld.id ? (
                      <Feather name="check-circle" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyChoice, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  No storyworlds are available yet.
                </Text>
              )}

              {selectedStoryworldId !== null ? (
                <>
                  <Text style={[styles.sheetLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                    OPEN PATH
                  </Text>
                  {pathsLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : paths?.filter((path) => path.state === 'open').length ? (
                    paths
                      .filter((path) => path.state === 'open')
                      .map((path) => (
                        <TouchableOpacity
                          key={path.id}
                          style={[
                            styles.choice,
                            {
                              backgroundColor:
                                selectedPathId === path.id
                                  ? colors.primary + '18'
                                  : colors.card,
                              borderColor:
                                selectedPathId === path.id
                                  ? colors.primary
                                  : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedPathId(path.id)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.choiceText}>
                            <Text style={[styles.choiceTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                              {path.title}
                            </Text>
                            <Text style={[styles.choiceSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                              Open for new scenes
                            </Text>
                          </View>
                          {selectedPathId === path.id ? (
                            <Feather name="check-circle" size={20} color={colors.primary} />
                          ) : null}
                        </TouchableOpacity>
                      ))
                  ) : (
                    <Text style={[styles.emptyChoice, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      This storyworld has no open paths yet.
                    </Text>
                  )}
                </>
              ) : null}

              {submitMutation.isError ? (
                <Text style={[styles.submitError, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>
                  {submitErrorMessage}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: colors.primary,
                    opacity:
                      selectedStoryworldId === null ||
                      selectedPathId === null ||
                      submitMutation.isPending
                        ? 0.45
                        : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={
                  selectedStoryworldId === null ||
                  selectedPathId === null ||
                  submitMutation.isPending
                }
                activeOpacity={0.85}
              >
                {submitMutation.isPending ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.confirmText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
                    Submit scene
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 2,
  },
  submitText: { fontSize: 15 },
  clearButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedNote: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  submitSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 34 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 20, marginBottom: 4 },
  sheetSub: { fontSize: 13 },
  sheetContent: { gap: 10, paddingBottom: 4 },
  sheetLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 2,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choiceText: { flex: 1, paddingRight: 10 },
  choiceTitle: { fontSize: 15, marginBottom: 3 },
  choiceSub: { fontSize: 12, lineHeight: 18 },
  emptyChoice: { fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  submitError: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 48,
    marginTop: 6,
  },
  confirmText: { fontSize: 15 },
  // Unauthenticated state
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  authTitle: { fontSize: 20, textAlign: 'center' },
  authSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  signInButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  signInText: { fontSize: 16 },
  registerLink: { fontSize: 14, textDecorationLine: 'underline' },
});
