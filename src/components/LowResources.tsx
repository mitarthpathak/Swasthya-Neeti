import { useEffect, useRef, useState, type CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BellDot,
  ChevronRight,
  Clock3,
  Languages,
  Menu,
  Mic,
  Moon,
  PencilLine,
  Plus,
  SendHorizonal,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Type,
  UserRound,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { User } from '../types';
import {
  deleteConversation,
  fetchConversationMessages,
  fetchHealthUpdates,
  fetchRecentChats,
  sendChatMessageRequest,
  transcribeAudioRequest,
  translateChatUi,
  type ChatHistoryMessage,
  type HealthUpdateItem,
  type RecentConversation,
} from '../services/chatApi';
import { defaultChatUiCopy, interpolate, type ChatUiCopy } from '../services/chatUiCopy';

type LowResourcesProps = {
  user: User | null;
  onBackHome: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenProfile: () => void;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
  isError?: boolean;
};

type PossibleCause = {
  name: string;
  chance: number;
};

const languages = [
  'English',
  'Hindi',
  'Bengali',
  'Marathi',
  'Tamil',
  'Telugu',
  'Gujarati',
  'Kannada',
  'Punjabi',
  'Malayalam',
];

const MIN_VOICE_RECORDING_MS = 1200;

function createChatMessage(
  role: ChatMessage['role'],
  content: string,
  options?: { isError?: boolean; timestamp?: string; id?: string },
): ChatMessage {
  return {
    id: options?.id ?? crypto.randomUUID(),
    role,
    content,
    timestamp: options?.timestamp ?? 'now',
    isError: options?.isError ?? false,
  };
}

function formatChatTimestamp(value?: string) {
  if (!value) {
    return 'now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'now';
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getUserInitials(name?: string) {
  const cleaned = (name || '').trim();
  if (!cleaned) {
    return 'RV';
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || cleaned.slice(0, 2).toUpperCase();
}

function buildPossibleCauses(message: string): PossibleCause[] {
  const text = message.toLowerCase();

  const causePools = [
    {
      match: /(cold|cough|fever|flu|sore throat|runny nose|chills)/i,
      items: ['Common cold', 'Viral fever', 'Flu', 'Sinus infection', 'Pneumonia'],
    },
    {
      match: /(stomach|abdomen|vomit|loose motion|diarrhea|nausea|gas)/i,
      items: ['Acidity', 'Stomach infection', 'Food poisoning', 'Gastritis', 'Dehydration'],
    },
    {
      match: /(headache|migraine|head pain|dizzy|dizziness|weak)/i,
      items: ['Fatigue', 'Dehydration', 'Migraine', 'Low blood pressure', 'Viral illness'],
    },
    {
      match: /(chest|breath|breathing|wheez|lung)/i,
      items: ['Chest infection', 'Bronchitis', 'Asthma flare', 'Pneumonia', 'Viral flu'],
    },
    {
      match: /(pain|arm|hand|leg|joint|body ache|back)/i,
      items: ['Muscle strain', 'Body ache from fever', 'Joint inflammation', 'Nerve irritation', 'Vitamin deficiency'],
    },
  ];

  const matchedPool = causePools.find((pool) => pool.match.test(text));
  const baseItems =
    matchedPool?.items || ['Seasonal infection', 'Fatigue', 'Mild viral illness', 'Dehydration', 'Inflammation'];
  const seed = [...message].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return baseItems.slice(0, 5).map((name, index) => {
    const base = Math.max(34, 86 - index * 11);
    const variance = (seed + index * 17) % 9;
    return {
      name,
      chance: Math.min(92, base + variance),
    };
  });
}

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

export function LowResources({
  user,
  onBackHome,
  onOpenAuth,
  onOpenProfile,
}: LowResourcesProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('Hindi');
  const [voiceComment, setVoiceComment] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentConversation[]>([]);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);
  const [updatesError, setUpdatesError] = useState<string | null>(null);
  const [healthUpdates, setHealthUpdates] = useState<{
    alerts: HealthUpdateItem[];
    news: HealthUpdateItem[];
    discoveries: HealthUpdateItem[];
  } | null>(null);
  const [uiCopy, setUiCopy] = useState<ChatUiCopy>(defaultChatUiCopy);
  const [isTranslatingUi, setIsTranslatingUi] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[] | null>(null);
  const [hasAssistantResponse, setHasAssistantResponse] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const translationCacheRef = useRef<Map<string, ChatUiCopy>>(new Map([['English', defaultChatUiCopy]]));

  const displayName = user?.username
    ? interpolate(uiCopy.greetingPrefix, { name: user.username })
    : uiCopy.greetingFallback;
  const userInitials = getUserInitials(user?.username);
  const latestUserMessage = [...chatMessages].reverse().find((message) => message.role === 'user')?.content || '';
  const possibleCauses = latestUserMessage ? buildPossibleCauses(latestUserMessage) : [];
  const visiblePrompts =
    hasAssistantResponse && suggestedPrompts && suggestedPrompts.length > 0
      ? suggestedPrompts
      : uiCopy.quickPrompts;

  const loadRecentChats = async (userEmail: string) => {
    try {
      const conversations = await fetchRecentChats(userEmail);
      setRecentChats(conversations);
    } catch (error) {
      console.error('Failed to load recent chats:', error);
      setRecentChats([]);
    }
  };

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
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const userEmail = user?.email;
    if (!userEmail) {
      setRecentChats([]);
      return undefined;
    }

    let cancelled = false;

    const syncRecentChats = async () => {
      try {
        const conversations = await fetchRecentChats(userEmail);
        if (!cancelled) {
          setRecentChats(conversations);
        }
      } catch (error) {
        console.error('Failed to load recent chats:', error);
        if (!cancelled) {
          setRecentChats([]);
        }
      }
    };

    void syncRecentChats();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;

    const loadTranslation = async () => {
      if (selectedLanguage === 'English') {
        setIsTranslatingUi(false);
        setUiCopy(defaultChatUiCopy);
        setSuggestedPrompts(null);
        return;
      }

      const cached = translationCacheRef.current.get(selectedLanguage);
      if (cached) {
        setIsTranslatingUi(false);
        setUiCopy(cached);
        setSuggestedPrompts(null);
        return;
      }

      try {
        setIsTranslatingUi(true);
        const translated = await translateChatUi(selectedLanguage, defaultChatUiCopy);
        if (!cancelled) {
          translationCacheRef.current.set(selectedLanguage, translated);
          setUiCopy(translated);
          setSuggestedPrompts(null);
        }
      } catch (error) {
        console.error('Failed to translate chat UI:', error);
        if (!cancelled) {
          setUiCopy(defaultChatUiCopy);
          setSuggestedPrompts(null);
        }
      } finally {
        if (!cancelled) {
          setIsTranslatingUi(false);
        }
      }
    };

    void loadTranslation();

    return () => {
      cancelled = true;
    };
  }, [selectedLanguage]);

  useEffect(() => {
    const container = conversationRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [chatMessages, isSending]);

  useEffect(() => {
    setInputValue('');
    setChatMessages([]);
    setVoiceComment('');
    setConversationId(null);
    setSuggestedPrompts(null);
    setHasAssistantResponse(false);
    setIsSidebarOpen(false);
  }, [user?.email]);

  const openUpdatesPopover = async () => {
    setIsAccessibilityOpen(false);
    setIsUpdatesOpen((current) => !current);

    if (healthUpdates || isLoadingUpdates) {
      return;
    }

    try {
      setIsLoadingUpdates(true);
      setUpdatesError(null);
      const updates = await fetchHealthUpdates();
      setHealthUpdates({
        alerts: updates.alerts,
        news: updates.news,
        discoveries: updates.discoveries,
      });
    } catch (error) {
      setUpdatesError(error instanceof Error ? error.message : uiCopy.updatesError);
    } finally {
      setIsLoadingUpdates(false);
    }
  };

  const resetChat = () => {
    setInputValue('');
    setChatMessages([]);
    setVoiceComment('');
    setConversationId(null);
    setSuggestedPrompts(null);
    setHasAssistantResponse(false);
  };

  const stopVoiceStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const transcribeRecordedAudio = async (audioBlob: Blob, extension: string) => {
    if (!audioBlob.size) {
      setVoiceComment('No voice detected. Please try again.');
      return;
    }

    try {
      setIsTranscribingVoice(true);
      setVoiceComment('Converting your voice to text...');
      const transcript = await transcribeAudioRequest(audioBlob, {
        filename: `recording.${extension}`,
      });
      if (transcript.trim()) {
        setInputValue((current) => {
          const nextValue = transcript.trim();
          return current.trim() ? `${current.trim()} ${nextValue}` : nextValue;
        });
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
        recorder.stop();
      }
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      stopVoiceStream();
      setIsRecordingVoice(false);
      setVoiceComment('Audio recording is too short. Please speak for at least 2 seconds.');
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
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setVoiceComment('Microphone permission is blocked. Please allow mic access.');
        return;
      }

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

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || isSending) {
      return;
    }

    const previousMessages = chatMessages;
    const userMessage = createChatMessage('user', trimmed);

    setChatMessages((current) => [...current, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      const payloadHistory: ChatHistoryMessage[] = previousMessages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

      const response = await sendChatMessageRequest({
        message: trimmed,
        language: selectedLanguage,
        conversationId: conversationId ?? undefined,
        history: payloadHistory,
        user: user
          ? {
              email: user.email,
              username: user.username,
            }
          : null,
      });

      setConversationId(response.conversationId);
      setChatMessages((current) => [...current, createChatMessage('assistant', response.reply)]);
      setSuggestedPrompts(response.suggestions?.length ? response.suggestions : null);
      setHasAssistantResponse(true);

      if (user?.email) {
        await loadRecentChats(user.email);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'I could not reach the health assistant right now. Please try again.';

      setChatMessages((current) => [
        ...current,
        createChatMessage('assistant', errorMessage, { isError: true }),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const loadConversationFromHistory = async (targetConversationId: string) => {
    const userEmail = user?.email;
    if (!userEmail || isLoadingConversation) {
      return;
    }

    try {
      setIsLoadingConversation(true);
      const messages = await fetchConversationMessages(userEmail, targetConversationId);
      setConversationId(targetConversationId);
      setChatMessages(
        messages.map((message) =>
          createChatMessage(message.role, message.content, {
            id: message.id,
            timestamp: formatChatTimestamp(message.createdAt),
          }),
        ),
      );
      setSelectedLanguage(messages[0]?.language || 'English');
      setInputValue('');
      setSuggestedPrompts(null);
      setHasAssistantResponse(messages.some((message) => message.role === 'assistant'));
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setChatMessages([
        createChatMessage(
          'assistant',
          error instanceof Error
            ? error.message
            : 'I could not load this saved chat right now. Please try again.',
          { isError: true },
        ),
      ]);
      setConversationId(null);
      setIsSidebarOpen(false);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleDeleteConversation = async (targetConversationId: string) => {
    const userEmail = user?.email;
    if (!userEmail || deletingConversationId) {
      return;
    }

    try {
      setDeletingConversationId(targetConversationId);
      await deleteConversation(userEmail, targetConversationId);
      setRecentChats((current) =>
        current.filter((chat) => chat.conversationId !== targetConversationId),
      );

      if (conversationId === targetConversationId) {
        resetChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      setChatMessages([
        createChatMessage(
          'assistant',
          error instanceof Error
            ? error.message
            : 'I could not delete this saved chat right now. Please try again.',
          { isError: true },
        ),
      ]);
    } finally {
      setDeletingConversationId(null);
    }
  };

  return (
    <div
      className={`low-resource-shell${isDarkTheme ? ' low-resource-shell-dark' : ''}`}
      style={{ '--chat-font-scale': fontScale } as CSSProperties}
    >
      <aside className={`low-resource-history${isSidebarOpen ? ' is-open' : ''}`}>
        <div className="low-resource-history-head">
          <div>
            <p>Saved chats</p>
            <strong>Recent history</strong>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} type="button">
            <X size={16} />
          </button>
        </div>

        <button
          className="low-resource-flat-button is-primary"
          onClick={() => {
            resetChat();
            setIsSidebarOpen(false);
          }}
          type="button"
        >
          <Plus size={16} />
          New chat
        </button>

        <div className="low-resource-history-list">
          {!user?.email ? (
            <div className="low-resource-empty-state">Sign in to save and reopen your chats.</div>
          ) : recentChats.length === 0 ? (
            <div className="low-resource-empty-state">No saved chats yet.</div>
          ) : (
            recentChats.map((chat) => (
              <article className="low-resource-history-card" key={chat.conversationId}>
                <button
                  className="low-resource-history-open"
                  onClick={() => void loadConversationFromHistory(chat.conversationId)}
                  type="button"
                >
                  <strong>{chat.preview}</strong>
                  <span>{chat.language}</span>
                  <small>{formatChatTimestamp(chat.updatedAt)}</small>
                </button>
                <button
                  className="low-resource-history-delete"
                  disabled={deletingConversationId === chat.conversationId}
                  onClick={() => void handleDeleteConversation(chat.conversationId)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))
          )}
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          aria-label="Close history"
          className="low-resource-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <div className="low-resource-page">
        <header className="low-resource-topbar">
          <button className="low-resource-brand-card" onClick={onBackHome} type="button">
            <BrandLogo className="low-resource-brand-mark" imageClassName="low-resource-brand-mark-image" />
            <div>
              <strong>Swasthya-Neeti</strong>
              <span>Online - पूछिए कुछ भी</span>
            </div>
          </button>

          <div className="low-resource-top-actions">
            <div className="low-resource-popover-wrap">
              <button className="low-resource-flat-button" onClick={() => void openUpdatesPopover()} type="button">
                <BellDot size={16} />
                नए अपडेट्स
              </button>
              {isUpdatesOpen ? (
                <div className="low-resource-popover">
                  <div className="low-resource-popover-head">
                    <strong>Updates</strong>
                    <button onClick={() => setIsUpdatesOpen(false)} type="button">
                      <X size={14} />
                    </button>
                  </div>
                  {isLoadingUpdates ? <p>Loading health updates...</p> : null}
                  {updatesError ? <p>{updatesError}</p> : null}
                  {!isLoadingUpdates && !updatesError && healthUpdates ? (
                    <div className="low-resource-updates-list">
                      {[
                        ...healthUpdates.alerts.slice(0, 2),
                        ...healthUpdates.news.slice(0, 2),
                        ...healthUpdates.discoveries.slice(0, 2),
                      ].map((item) => (
                        <a href={item.url} key={`${item.source}-${item.title}`} rel="noreferrer" target="_blank">
                          <strong>{item.title}</strong>
                          <span>{item.source}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="low-resource-popover-wrap">
              <button
                className="low-resource-flat-button"
                onClick={() => {
                  setIsUpdatesOpen(false);
                  setIsAccessibilityOpen((current) => !current);
                }}
                type="button"
              >
                <Settings2 size={16} />
                Accessibility
              </button>
              {isAccessibilityOpen ? (
                <div className="low-resource-popover">
                  <div className="low-resource-popover-head">
                    <strong>Accessibility</strong>
                    <button onClick={() => setIsAccessibilityOpen(false)} type="button">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="low-resource-access-row">
                    <span>{isDarkTheme ? 'Dark theme' : 'Light theme'}</span>
                    <button
                      className="low-resource-icon-button"
                      onClick={() => setIsDarkTheme((current) => !current)}
                      type="button"
                    >
                      {isDarkTheme ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                  </div>
                  <div className="low-resource-access-row">
                    <span>Font size {Math.round(fontScale * 100)}%</span>
                    <div className="low-resource-access-stepper">
                      <button
                        onClick={() => setFontScale((current) => Math.max(0.9, Number((current - 0.1).toFixed(2))))}
                        type="button"
                      >
                        <Type size={14} />
                        -
                      </button>
                      <button
                        onClick={() => setFontScale((current) => Math.min(1.2, Number((current + 0.1).toFixed(2))))}
                        type="button"
                      >
                        <Type size={14} />+
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              className="low-resource-user-card"
              onClick={() => {
                if (user) {
                  onOpenProfile();
                  return;
                }
                onOpenAuth('signin');
              }}
              type="button"
            >
              <span className="low-resource-user-avatar">{user ? userInitials : <UserRound size={14} />}</span>
              <span className="low-resource-user-copy">
                <strong>{user ? displayName : 'Sign in to continue'}</strong>
                <small>Online - पूछिए कुछ भी</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        <main className="low-resource-layout">
          <section className="low-resource-chat-column">
            <div className="low-resource-chat-card">
              <div className="low-resource-chat-head">
                <div className="low-resource-chat-title">
                  <BrandLogo className="low-resource-mini-brand" imageClassName="low-resource-brand-mark-image" />
                  <div>
                    <strong>{uiCopy.chatTitle}</strong>
                    <span>{isTranslatingUi ? 'Translating interface...' : uiCopy.statusOnline}</span>
                  </div>
                </div>
                <div className="low-resource-chat-head-actions">
                  <button className="low-resource-icon-button" onClick={() => setIsSidebarOpen(true)} type="button">
                    <Menu size={16} />
                  </button>
                  <button className="low-resource-icon-button" onClick={resetChat} type="button">
                    <PencilLine size={16} />
                  </button>
                </div>
              </div>

              <div className="low-resource-conversation" ref={conversationRef}>
                {chatMessages.length === 0 ? (
                  <div className="low-resource-empty-chat">
                    <div className="low-resource-empty-bubble">
                      <BrandLogo className="low-resource-mini-brand" imageClassName="low-resource-brand-mark-image" />
                      <div>
                        <strong>{displayName}</strong>
                        <p>{uiCopy.heroSubtitle}</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {chatMessages.map((message) => (
                  <div
                    className={`low-resource-message-row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
                    key={message.id}
                  >
                    {message.role === 'assistant' ? (
                      <BrandLogo className="low-resource-message-mark" imageClassName="low-resource-brand-mark-image" />
                    ) : (
                      <span className="low-resource-message-mark user">{userInitials}</span>
                    )}
                    <article className={`low-resource-message-card${message.isError ? ' is-error' : ''}`}>
                      {message.role === 'assistant' ? <strong>{uiCopy.chatTitle}</strong> : null}
                      {message.role === 'assistant' ? (
                        <div className="markdown-renderer">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                      <small>{message.timestamp}</small>
                    </article>
                  </div>
                ))}

                {isSending ? (
                  <div className="low-resource-message-row is-assistant">
                    <BrandLogo className="low-resource-message-mark" imageClassName="low-resource-brand-mark-image" />
                    <article className="low-resource-message-card">
                      <strong>{uiCopy.chatTitle}</strong>
                      <p>{uiCopy.sendingLabel}</p>
                    </article>
                  </div>
                ) : null}
              </div>

              <div className="low-resource-prompt-row">
                {visiblePrompts.slice(0, 4).map((prompt) => (
                  <button
                    className="low-resource-prompt-chip"
                    key={prompt}
                    onClick={() => void sendMessage(prompt)}
                    type="button"
                  >
                    <ChevronRight size={14} />
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="low-resource-composer">
                <button
                  className={`low-resource-mic-button${isRecordingVoice ? ' is-recording' : ''}`}
                  disabled={isTranscribingVoice}
                  onClick={() => void handleVoiceButtonClick()}
                  type="button"
                >
                  <Mic size={18} />
                </button>
                <input
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(inputValue);
                    }
                  }}
                  placeholder={uiCopy.chatInputPlaceholder}
                  type="text"
                  value={inputValue}
                />
                <button
                  className="low-resource-send-button"
                  disabled={isSending}
                  onClick={() => void sendMessage(inputValue)}
                  type="button"
                >
                  <SendHorizonal size={18} />
                </button>
              </div>

              {voiceComment ? <p className="low-resource-voice-note">{voiceComment}</p> : null}
              {isLoadingConversation ? <p className="low-resource-voice-note">Opening saved chat...</p> : null}
            </div>
          </section>

          <aside className="low-resource-side-column">
            <section className="low-resource-side-card">
              <div className="low-resource-side-head">
                <Sparkles size={16} />
                <strong>Possible Causes</strong>
              </div>
              <p>Based on latest symptoms.</p>
              <div className="low-resource-cause-list">
                {(possibleCauses.length ? possibleCauses : buildPossibleCauses('general fatigue')).slice(0, 5).map((cause) => (
                  <div className="low-resource-cause-item" key={cause.name}>
                    <div className="low-resource-cause-copy">
                      <strong>{cause.name}</strong>
                      <span>{cause.chance}%</span>
                    </div>
                    <div className="low-resource-cause-bar">
                      <i style={{ width: `${cause.chance}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="low-resource-side-card">
              <div className="low-resource-side-head">
                <Languages size={16} />
                <strong>{uiCopy.languageCardTitle}</strong>
              </div>
              <label className="low-resource-language-picker">
                <span>{uiCopy.languageLabel}</span>
                <select onChange={(event) => setSelectedLanguage(event.target.value)} value={selectedLanguage}>
                  {languages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="low-resource-side-card">
              <a className="low-resource-callout" href="tel:9587507407">
                {uiCopy.callDoctorButton}
              </a>
              <p className="low-resource-callout-text">{uiCopy.emergencyBanner}</p>
              <div className="low-resource-tool-list">
                <button className="low-resource-flat-button" onClick={() => setIsSidebarOpen(true)} type="button">
                  <Clock3 size={16} />
                  Open history
                </button>
                <button className="low-resource-flat-button" onClick={resetChat} type="button">
                  <PencilLine size={16} />
                  Start new chat
                </button>
                {!user ? (
                  <button className="low-resource-flat-button" onClick={() => onOpenAuth('signin')} type="button">
                    Sign in for saved chats
                  </button>
                ) : null}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
