import { useEffect, useRef, useState } from 'react';
import { transcribeAudioRequest } from '../services/chatApi';

type UseVoiceRecorderProps = {
  inputValue: string;
  onInputValueChange: (value: string) => void;
  selectedLanguage: string;
};

const MIN_VOICE_RECORDING_MS = 1500;

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export function useVoiceRecorder({
  inputValue,
  onInputValueChange,
  selectedLanguage,
}: UseVoiceRecorderProps) {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [voiceComment, setVoiceComment] = useState('');
  const [permissionErrorMessage, setPermissionErrorMessage] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const inputValueRef = useRef(inputValue);
  const selectedLanguageRef = useRef(selectedLanguage);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (!voiceComment) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVoiceComment('');
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [voiceComment]);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    };
  }, []);

  const stopVoiceStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const transcribeRecordedAudio = async (audioBlob: Blob, extension: string) => {
    if (!audioBlob.size || audioBlob.size < 1000) {
      setVoiceComment('Recording too short. Please speak for at least 1.5 seconds.');
      return;
    }

    try {
      setIsTranscribingVoice(true);
      setPermissionErrorMessage('');
      setVoiceComment('Converting your voice to text...');

      const transcript = await transcribeAudioRequest(audioBlob, {
        filename: `recording.${extension}`,
        language: selectedLanguageRef.current,
      });

      if (transcript.trim()) {
        const appendedTranscript = transcript.trim();
        const nextInputValue = inputValueRef.current.trim()
          ? `${inputValueRef.current.trim()} ${appendedTranscript}`
          : appendedTranscript;

        onInputValueChange(nextInputValue);
        setVoiceComment('Voice added to the message box.');
      } else {
        setVoiceComment('I could not hear enough speech. Please try again.');
      }
    } catch (error) {
      setVoiceComment(
        error instanceof Error
          ? error.message
          : 'Voice transcription failed. Please try again.',
      );
    } finally {
      setIsTranscribingVoice(false);
    }
  };

  const stopVoiceRecording = async () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    const recordingDuration = recordingStartedAtRef.current
      ? Date.now() - recordingStartedAtRef.current
      : 0;

    recordingStartedAtRef.current = null;

    if (recordingDuration > 0 && recordingDuration < MIN_VOICE_RECORDING_MS) {
      if (recorder.state !== 'inactive') {
        recorder.onstop = null;
        recorder.stop();
      }

      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      stopVoiceStream();
      setIsRecordingVoice(false);
      setVoiceComment('Audio recording is too short. Please speak for at least 1.5 seconds.');
      return;
    }

    setVoiceComment('Processing your recording...');
    setIsRecordingVoice(false);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('ogg')
          ? 'ogg'
          : mimeType.includes('mp4')
            ? 'mp4'
            : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopVoiceStream();
        void transcribeRecordedAudio(audioBlob, extension).finally(resolve);
      };

      if (typeof recorder.requestData === 'function' && recorder.state === 'recording') {
        recorder.requestData();
      }

      recorder.stop();
    });
  };

  const startVoiceRecording = async () => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setPermissionErrorMessage('');
      setVoiceComment('Voice recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setPermissionErrorMessage('');

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsRecordingVoice(false);
        recordingStartedAtRef.current = null;
        stopVoiceStream();
        setVoiceComment('Microphone recording failed. Please try again.');
      };

      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      setIsRecordingVoice(true);
      setVoiceComment('Recording... tap again when you are done.');
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError')
      ) {
        setPermissionErrorMessage(
          'Microphone permission is blocked. Please allow mic access and try again.',
        );
        setVoiceComment('');
        return;
      }

      setPermissionErrorMessage('');
      setVoiceComment('I could not start the microphone. Please try again.');
    }
  };

  const handleVoiceButtonClick = async () => {
    if (isTranscribingVoice) {
      return;
    }

    if (isRecordingVoice) {
      await stopVoiceRecording();
      return;
    }

    await startVoiceRecording();
  };

  return {
    isRecordingVoice,
    isTranscribingVoice,
    voiceComment,
    permissionErrorMessage,
    handleVoiceButtonClick,
  };
}
