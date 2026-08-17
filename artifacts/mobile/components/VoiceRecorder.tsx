/**
 * VoiceRecorder — captures voice and converts to text.
 *
 * Web:    Uses window.SpeechRecognition for real-time transcription.
 * Native: Records audio with expo-av, uploads base64 to /api/transcribe
 *         (Whisper). Falls back to manual text entry if the server returns 503.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

// Lazy-loaded native audio module (undefined on web)
let AudioModule: typeof import('expo-av').Audio | undefined;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AudioModule = require('expo-av').Audio;
  } catch {
    // expo-av not installed — native recording unavailable
  }
}

/**
 * Convert a local file:// URI to a base64 string without expo-file-system.
 *
 * React Native's fetch() handles file:// URIs; we then use the platform
 * FileReader (available since RN 0.73 / Expo SDK 50) to encode as data URL
 * and strip the data: prefix.
 */
async function uriToBase64(uri: string): Promise<string> {
  const resp = await fetch(uri);
  const blob = await resp.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // "data:audio/m4a;base64,XXXX..." → "XXXX..."
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

// Web SpeechRecognition — define locally to avoid @types/dom dependency
type WebSpeechRecognitionResult = {
  readonly 0: { transcript: string };
  readonly length: number;
};
type WebSpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: WebSpeechRecognitionResult;
};
type WebSpeechRecognitionEvent = {
  readonly results: WebSpeechRecognitionResultList;
};
type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
let WebSpeechRecognitionClass: (new () => WebSpeechRecognition) | undefined;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  WebSpeechRecognitionClass =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
}

interface Props {
  /** Called when transcription is ready (or when the user confirms typed text). */
  onTranscript: (text: string) => void;
}

export function VoiceRecorder({ onTranscript }: Props) {
  const colors = useColors();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordingRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const liveTextRef = useRef('');

  // Keep ref in sync for use in callbacks
  liveTextRef.current = liveText;

  // Pulsing ring animation while recording
  const scale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      ringOpacity.value = withTiming(1, { duration: 200 });
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(ringOpacity);
      scale.value = withTiming(1, { duration: 200 });
      ringOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, scale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: ringOpacity.value,
  }));

  // ─── Web: SpeechRecognition ────────────────────────────────────────────────

  // Track whether we manually stopped recognition so onend doesn't
  // deliver a duplicate transcript (stop() → onend fires unconditionally).
  const manualStopRef = useRef(false);

  const startWebRecognition = useCallback(() => {
    if (!WebSpeechRecognitionClass) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new WebSpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setLiveText(transcript);
    };
    recognition.onerror = () => {
      setError('Could not access microphone. Check browser permissions.');
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      // Only deliver the transcript from onend when recognition ended
      // naturally (e.g. silence timeout). When stopped manually,
      // stopWebRecognition already delivered it.
      if (!manualStopRef.current) {
        const text = liveTextRef.current;
        if (text) onTranscript(text);
      }
      manualStopRef.current = false;
    };

    recognitionRef.current = recognition;
    manualStopRef.current = false;
    recognition.start();
    setIsRecording(true);
    setError(null);
    setLiveText('');
  }, [onTranscript]);

  const stopWebRecognition = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    setIsRecording(false);
    const text = liveTextRef.current;
    if (text) onTranscript(text);
  }, [onTranscript]);

  // ─── Native: expo-av + Whisper ─────────────────────────────────────────────

  const startNativeRecording = useCallback(async () => {
    if (!AudioModule) {
      setError('Audio recording requires expo-av.');
      return;
    }
    try {
      const { granted } = await AudioModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied.');
        return;
      }
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setError(null);
      setLiveText('');
    } catch {
      setError('Could not start recording.');
    }
  }, []);

  const stopNativeRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || !AudioModule) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      await AudioModule.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error('No recording URI');

      // Convert the recorded file to base64 using FileReader + fetch(uri).
      // This avoids expo-file-system entirely and works with SDK 54+.
      const base64 = await uriToBase64(uri);

      const domain = process.env['EXPO_PUBLIC_DOMAIN'];
      const resp = await fetch(`https://${domain}/api/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ audioBase64: base64, mimeType: 'audio/m4a' }),
      });

      if (resp.ok) {
        const data = (await resp.json()) as { text: string };
        setLiveText(data.text);
        onTranscript(data.text);
      } else if (resp.status === 503) {
        setError('Transcription requires OPENAI_API_KEY on the server. Type your narration below.');
      } else {
        setError('Transcription failed. Type your narration below.');
      }
    } catch {
      setError('Transcription failed. Type your narration below.');
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscript]);

  // ─── Unified toggle ────────────────────────────────────────────────────────

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isRecording) {
      if (Platform.OS === 'web') {
        stopWebRecognition();
      } else {
        await stopNativeRecording();
      }
    } else {
      if (Platform.OS === 'web') {
        startWebRecognition();
      } else {
        await startNativeRecording();
      }
    }
  };

  const statusText = isTranscribing
    ? 'Transcribing...'
    : isRecording
      ? 'Tap to stop'
      : 'Tap to narrate';

  return (
    <View style={styles.container}>
      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: isRecording ? colors.accent + '88' : colors.primary + '44',
            backgroundColor: isRecording ? colors.accent + '11' : 'transparent',
          },
          ringStyle,
        ]}
      />

      {/* Record button */}
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isRecording ? colors.accent : colors.primary,
          },
        ]}
        onPress={handlePress}
        disabled={isTranscribing}
        activeOpacity={0.85}
      >
        {isTranscribing ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <Feather
            name={isRecording ? 'square' : 'mic'}
            size={30}
            color={isRecording ? '#FFFFFF' : colors.primaryForeground}
          />
        )}
      </TouchableOpacity>

      <Text
        style={[
          styles.hint,
          { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
        ]}
      >
        {statusText}
      </Text>

      {liveText ? (
        <View
          style={[
            styles.transcriptBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.transcriptText,
              { color: colors.foreground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            {liveText}
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text
          style={[
            styles.error,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  ring: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
  },
  button: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 14,
  },
  transcriptBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    width: '100%',
    maxWidth: 380,
  },
  transcriptText: {
    fontSize: 15,
    lineHeight: 24,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
