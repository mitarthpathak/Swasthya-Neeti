import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  BellDot,
  ChevronDown,
  ChevronRight,
  Clock3,
  Expand,
  Languages,
  MessageSquarePlus,
  Mic,
  Moon,
  PencilLine,
  SendHorizonal,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import type { User } from '../types';
import { deleteConversation, fetchConversationMessages, fetchHealthUpdates, fetchRecentChats, sendChatMessageRequest, translateChatUi, type ChatHistoryMessage, type HealthUpdateItem, type RecentConversation } from '../services/chatApi';
import { defaultChatUiCopy, interpolate, type ChatUiCopy } from '../services/chatUiCopy';

type ChatWorkspaceProps = {
  user: User | null;
  onBackHome: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onOpenProfile: () => void;
  initialConversationId?: string | null;
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
  const baseItems = matchedPool?.items || ['Seasonal infection', 'Fatigue', 'Mild viral illness', 'Dehydration', 'Inflammation'];
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

export function ChatWorkspace({
  user,
  onBackHome,
  onOpenAuth,
  onOpenProfile,
  initialConversationId = null,
}: ChatWorkspaceProps) {
  const [sidebarMode, setSidebarMode] = useState<'default' | 'expanded'>('default');
  const [tipIndex, setTipIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [recentChats, setRecentChats] = useState<RecentConversation[]>([]);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
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
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const languageCardRef = useRef<HTMLDivElement | null>(null);
  const translationCacheRef = useRef<Map<string, ChatUiCopy>>(new Map([['English', defaultChatUiCopy]]));
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const displayName = user?.username
    ? interpolate(uiCopy.greetingPrefix, { name: user.username })
    : uiCopy.greetingFallback;
  const userInitials = getUserInitials(user?.username);
  const hasUserSentMessage = chatMessages.some((message) => message.role === 'user');
  const latestUserMessage = [...chatMessages].reverse().find((message) => message.role === 'user')?.content || '';
  const possibleCauses = latestUserMessage ? buildPossibleCauses(latestUserMessage) : [];
  const visiblePrompts =
    hasAssistantResponse && suggestedPrompts && suggestedPrompts.length > 0
      ? suggestedPrompts
      : uiCopy.quickPrompts;
  const {
    isRecordingVoice,
    isTranscribingVoice,
    voiceComment,
    permissionErrorMessage,
    handleVoiceButtonClick,
  } = useVoiceRecorder({
    inputValue,
    onInputValueChange: setInputValue,
    selectedLanguage,
  });

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
    if (hasUserSentMessage) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % uiCopy.healthTips.length);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [hasUserSentMessage, uiCopy.healthTips.length]);

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
    if (initialConversationId && user?.email) {
      void loadConversationFromHistory(initialConversationId);
    }
  }, [initialConversationId, user?.email]);

  useEffect(() => {
    const container = conversationRef.current;
    if (!container) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [chatMessages, isSending]);

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

  const openAccessibilityPopover = () => {
    setIsUpdatesOpen(false);
    setIsAccessibilityOpen((current) => !current);
  };

  const openLanguagePickerFromAccessibility = () => {
    setIsAccessibilityOpen(false);
    window.setTimeout(() => {
      languageCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setIsLanguageOpen(true);
    }, 140);
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

  const resetChat = () => {
    setInputValue('');
    setChatMessages([]);
    setConversationId(null);
    setSuggestedPrompts(null);
    setHasAssistantResponse(false);
  };

  useEffect(() => {
    resetChat();
    setIsSidebarOpen(false);
  }, [user?.email]);

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

  const openHistorySidebar = () => {
    setSidebarMode('default');
    setIsSidebarOpen(true);
    if (user?.email) {
      void loadRecentChats(user.email);
    }
  };

  const openExpandedSidebar = () => {
    setSidebarMode('expanded');
    setIsSidebarOpen(true);
    if (user?.email) {
      void loadRecentChats(user.email);
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
      className={`chatpage-shell${isDarkTheme ? ' accessibility-dark' : ''}`}
      style={{ '--chat-font-scale': fontScale } as CSSProperties}
    >
      <div className="chatpage-bg-glow glow-left" />
      <div className="chatpage-bg-glow glow-right" />

      <motion.header
        className="chatpage-topbar"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        >
        <div className="chatpage-top-left">
          <button className="chatpage-brand" onClick={onBackHome} type="button">
            <BrandLogo className="chatpage-avatar primary bubble-avatar" imageClassName="chatpage-avatar-image" />
            <div>
              <strong>Swasthya-Neeti</strong>
              <span>{uiCopy.statusOnline}</span>
            </div>
          </button>
        </div>

        <div className="chatpage-top-actions">
          <button className="chatpage-update-bell" onClick={() => void openUpdatesPopover()} type="button">
            <BellDot size={18} />
            <span>{uiCopy.updateIdle}</span>
          </button>

          <div className="chatpage-accessibility-wrap">
            <button
              className="chatpage-update-bell chatpage-accessibility-trigger"
              onClick={openAccessibilityPopover}
              type="button"
            >
              <Settings2 size={18} />
              <span>Accessibility</span>
            </button>

            <AnimatePresence>
              {isAccessibilityOpen ? (
                <motion.div
                  className="chatpage-accessibility-popover"
                  initial={{ opacity: 0, y: 10, scale: 0.96, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 8, scale: 0.96, filter: 'blur(8px)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <div className="accessibility-popover-head">
                    <div>
                      <p>Accessibility</p>
                      <strong>Quick display controls</strong>
                    </div>
                    <button onClick={() => setIsAccessibilityOpen(false)} type="button">
                      <X size={15} />
                    </button>
                  </div>

                  <div className="accessibility-option-row">
                    <div className="accessibility-option-copy">
                      <strong>{isDarkTheme ? 'Dark theme' : 'Light theme'}</strong>
                      <span>Switch reading mode</span>
                    </div>
                    <button
                      className="accessibility-mini-button"
                      onClick={() => setIsDarkTheme((current) => !current)}
                      type="button"
                    >
                      {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </div>

                  <div className="accessibility-option-row">
                    <div className="accessibility-option-copy">
                      <strong>Screen font</strong>
                      <span>{Math.round(fontScale * 100)}%</span>
                    </div>
                    <div className="accessibility-stepper">
                      <button
                        className="accessibility-mini-button"
                        disabled={fontScale <= 0.9}
                        onClick={() => setFontScale((current) => Math.max(0.9, Number((current - 0.1).toFixed(2))))}
                        type="button"
                      >
                        <Type size={15} />
                        <small>-</small>
                      </button>
                      <button
                        className="accessibility-mini-button"
                        disabled={fontScale >= 1.2}
                        onClick={() => setFontScale((current) => Math.min(1.2, Number((current + 0.1).toFixed(2))))}
                        type="button"
                      >
                        <Type size={15} />
                        <small>+</small>
                      </button>
                    </div>
                  </div>

                  <button
                    className="accessibility-translate-button"
                    onClick={openLanguagePickerFromAccessibility}
                    type="button"
                  >
                    <Languages size={16} />
                    Translate page
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            className="chatpage-user-card"
            onClick={() => {
              if (user) {
                onOpenProfile();
              } else {
                onOpenAuth('signin');
              }
            }}
            type="button"
          >
            <div className="chatpage-avatar secondary">{userInitials}</div>
            <div>
              <strong>{displayName}</strong>
              {!user ? <span>{uiCopy.signInSavedChats}</span> : null}
            </div>
            <ChevronRight size={16} />
          </button>

          {!user ? (
            <>
              <button className="chatpage-logout" onClick={() => onOpenAuth('signin')} type="button">
                {uiCopy.signIn}
              </button>
              <button className="chatpage-notify" onClick={() => onOpenAuth('signup')} type="button">
                {uiCopy.signUp}
              </button>
            </>
          ) : null}
        </div>
      </motion.header>

      <AnimatePresence>
        {isUpdatesOpen ? (
          <>
            <motion.div
              className="chatpage-updates-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUpdatesOpen(false)}
            />

            <motion.div
              className="chatpage-updates-shell"
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <motion.aside
                className="chatpage-updates-popover"
                initial={{ opacity: 0, y: 12, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 8, filter: 'blur(10px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <div className="updates-popover-head">
                  <div>
                    <p>{uiCopy.updatesTitle}</p>
                    <strong>{uiCopy.updatesSubtitle}</strong>
                  </div>
                  <button onClick={() => setIsUpdatesOpen(false)} type="button">
                    <X size={16} />
                  </button>
                </div>

                {isLoadingUpdates ? (
                  <div className="updates-popover-state">{uiCopy.updatesLoading}</div>
                ) : updatesError ? (
                  <div className="updates-popover-state error">{updatesError}</div>
                ) : healthUpdates ? (
                  <div className="updates-popover-body">
                    {[
                      { title: uiCopy.updatesAlertsTitle, items: healthUpdates.alerts },
                      { title: uiCopy.updatesNewsTitle, items: healthUpdates.news },
                      { title: uiCopy.updatesDiscoveriesTitle, items: healthUpdates.discoveries },
                    ].map((section) => (
                      <div className="updates-section" key={section.title}>
                        <span>{section.title}</span>
                        {section.items.length > 0 ? (
                          section.items.slice(0, 3).map((item) => (
                            <a href={item.url} key={`${section.title}-${item.title}`} rel="noreferrer" target="_blank">
                              <strong>{item.title}</strong>
                              <small>{item.source} - {item.date}</small>
                              {item.summary ? <p>{item.summary}</p> : null}
                            </a>
                          ))
                        ) : (
                          <div className="updates-popover-state">{uiCopy.updatesEmpty}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="updates-popover-state">{uiCopy.updatesEmpty}</div>
                )}
              </motion.aside>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div className="chatpage-sidebar-dock">
        <button className="chatpage-dock-button" onClick={resetChat} type="button">
          <MessageSquarePlus size={18} />
        </button>
        <button
          className="chatpage-dock-button"
          onClick={openHistorySidebar}
          type="button"
        >
          <Clock3 size={18} />
        </button>
        <button
          className="chatpage-dock-button primary"
          onClick={openExpandedSidebar}
          type="button"
        >
          <Expand size={18} />
        </button>
      </div>

      <AnimatePresence>
        {isSidebarOpen ? (
          <>
            <motion.div
              className="chatpage-sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />

            <motion.aside
              className={`chatpage-overlay-sidebar${sidebarMode === 'expanded' ? ' expanded' : ''}`}
              initial={{ opacity: 0, x: 34, filter: 'blur(12px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 22, filter: 'blur(12px)' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <div className="overlay-sidebar-head">
                <div>
                  <p>{uiCopy.sidebarTitle}</p>
                  <strong>{uiCopy.sidebarSubtitle}</strong>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} type="button">
                  <X size={18} />
                </button>
              </div>

              <div className={`overlay-sidebar-body${sidebarMode === 'expanded' ? ' expanded' : ''}`}>
                <div className="overlay-sidebar-primary">
                  <button className="overlay-sidebar-action" onClick={resetChat} type="button">
                    <MessageSquarePlus size={18} />
                    {uiCopy.newChat}
                  </button>

                  <div className={`overlay-sidebar-section recent-chats-section${sidebarMode === 'expanded' ? ' expanded' : ''}`}>
                    <span>{uiCopy.recentChats}</span>
                    {recentChats.length > 0 ? (
                      recentChats.map((chat) => (
                        <div className="recent-chat-item" key={chat.conversationId}>
                          <button
                            className="recent-chat-open"
                            onClick={() => {
                              void loadConversationFromHistory(chat.conversationId);
                            }}
                            type="button"
                          >
                            {chat.preview}
                          </button>
                          <button
                            aria-label="Delete saved chat"
                            className="recent-chat-delete"
                            disabled={deletingConversationId === chat.conversationId}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteConversation(chat.conversationId);
                            }}
                            type="button"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <>
                        <button type="button">
                          {isLoadingConversation
                            ? 'Loading saved chat...'
                            : user
                              ? uiCopy.noSavedChats
                              : uiCopy.signInToSaveChats}
                        </button>
                        <button type="button">{uiCopy.starterHint}</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="overlay-sidebar-secondary">
                  <div className="overlay-sidebar-section">
                    <span>{uiCopy.quickTools}</span>
                    <button onClick={() => setInputValue(uiCopy.emergencyGuidancePrompt)} type="button">
                      {uiCopy.emergencyGuidance}
                    </button>
                    <button onClick={() => setInputValue(uiCopy.savedResponsesPrompt)} type="button">
                      {uiCopy.savedResponses}
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main className="chatpage-layout">
        <motion.section
          className="chatpage-main-panel"
          initial={{ opacity: 0, x: -24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <div className="chatpage-panel-head">
            <div className="chatpage-panel-profile">
              <BrandLogo className="chatpage-avatar primary bubble-avatar" imageClassName="chatpage-avatar-image" />
              <div>
                <strong>{uiCopy.assistantTitle}</strong>
                <span>{uiCopy.statusOnline}</span>
              </div>
            </div>

            <div className="chatpage-panel-icons">
              <button type="button">
                <Sparkles size={16} />
              </button>
              <button onClick={resetChat} type="button">
                <PencilLine size={16} />
              </button>
            </div>
          </div>

          <div className="chatpage-conversation" ref={conversationRef}>
            <motion.div
              className="chat-bubble bot intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.45 }}
            >
              <BrandLogo className="chatpage-avatar primary bubble-avatar" imageClassName="chatpage-avatar-image" />
              <div className="chat-bubble-content">
                <strong>{interpolate(uiCopy.introGreeting, { name: user?.username || 'Ravi' })}</strong>
                <p>{uiCopy.introMessage}</p>
                <div className="chat-disclaimer-notice">
                  <ShieldCheck size={14} />
                  <span>This chatbot provides general health guidance only and is not a substitute for professional medical advice.</span>
                </div>
                <span>now</span>
              </div>
            </motion.div>

            {!hasUserSentMessage ? (
              <div className="chatpage-prompt-list">
                {visiblePrompts.map((prompt, index) => (
                  <motion.button
                    key={prompt}
                    className="chatpage-prompt-chip"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      void sendMessage(prompt);
                    }}
                    transition={{ delay: 0.18 + index * 0.08, duration: 0.35 }}
                    type="button"
                  >
                    <ChevronRight size={14} />
                    {prompt}
                  </motion.button>
                ))}
              </div>
            ) : null}

            <AnimatePresence>
              {chatMessages.map((message) =>
                message.role === 'assistant' ? (
                  <motion.div
                    key={message.id}
                    className="chat-bubble bot"
                    initial={{ opacity: 0, y: 14, x: -8 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  >
                    <BrandLogo className="chatpage-avatar primary bubble-avatar" imageClassName="chatpage-avatar-image" />
                    <div className="chat-bubble-content">
                      <strong>{message.isError ? uiCopy.connectionIssue : uiCopy.assistantReplyLabel}</strong>
                      <div className="markdown-renderer">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      <span>{message.timestamp}</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={message.id}
                    className="chat-bubble user"
                    initial={{ opacity: 0, y: 14, x: 12 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  >
                    <div className="chat-bubble-content">
                      <strong>{message.content}</strong>
                      <span>{message.timestamp}</span>
                    </div>
                  </motion.div>
                ),
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isSending ? (
                <motion.div
                  className="chat-bubble bot"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <BrandLogo className="chatpage-avatar primary bubble-avatar" imageClassName="chatpage-avatar-image" />
                  <div className="chat-bubble-content typing-bubble">
                    <div className="typing-dots" aria-label="Assistant is typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="chatpage-input-wrap">
            {hasUserSentMessage ? (
              <div className="chatpage-prompt-list chatpage-prompt-list-inline">
                {visiblePrompts.map((prompt) => (
                  <motion.button
                    key={`${prompt}-inline`}
                    className="chatpage-prompt-chip"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      void sendMessage(prompt);
                    }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    type="button"
                  >
                    <ChevronRight size={14} />
                    {prompt}
                  </motion.button>
                ))}
              </div>
            ) : null}
            <div className="chatpage-input-bar">
              <button
                aria-label={isRecordingVoice ? 'Stop voice recording' : 'Start voice recording'}
                className={`chatpage-mic-button${isRecordingVoice ? ' recording' : ''}${isTranscribingVoice ? ' transcribing' : ''}`}
                disabled={isTranscribingVoice}
                onClick={() => {
                  void handleVoiceButtonClick();
                }}
                type="button"
              >
                <Mic size={22} />
              </button>
              <input
                className="chatpage-real-input"
                disabled={isSending}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void sendMessage(inputValue);
                  }
                }}
                placeholder={uiCopy.inputPlaceholder}
                type="text"
                value={inputValue}
              />
              <motion.button
                className="chatpage-send-button"
                onClick={() => {
                  void sendMessage(inputValue);
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="button"
              >
                <SendHorizonal size={22} />
              </motion.button>
            </div>

            <AnimatePresence>
              {voiceComment ? (
                <motion.p
                  className="voice-comment-note"
                  initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {voiceComment}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {permissionErrorMessage ? (
                <motion.p
                  className="voice-comment-note voice-error-note"
                  initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {permissionErrorMessage}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.section>

        <motion.aside
          className="chatpage-side-column"
          initial={{ opacity: 0, x: 24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, delay: 0.08, ease: 'easeOut' }}
        >
          <motion.div
            className="chatpage-side-card tip-card"
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
          >
            <div className="tip-head">
              <Sparkles size={20} />
              <strong>{hasUserSentMessage ? 'Possible Causes' : uiCopy.healthTip}</strong>
            </div>
            {hasUserSentMessage ? (
              <div className="possible-causes-panel">
                <p className="possible-causes-caption">Based on latest symptoms.</p>
                <div className="possible-causes-table">
                  <div className="possible-causes-head">
                    <span>Disease</span>
                    <span>Possibility</span>
                  </div>
                  {possibleCauses.map((cause) => (
                    <div className="possible-cause-row" key={cause.name}>
                      <div className="possible-cause-copy">
                        <strong>{cause.name}</strong>
                        <div className="possible-cause-bar">
                          <span style={{ width: `${cause.chance}%` }} />
                        </div>
                      </div>
                      <b>{cause.chance}%</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', y: -8 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                  {uiCopy.healthTips[tipIndex]}
                </motion.p>
              </AnimatePresence>
            )}
          </motion.div>

          <div className={`chatpage-side-card language-card${isLanguageOpen ? ' open' : ''}`} ref={languageCardRef}>
            <div className="language-head">
              <strong>{uiCopy.chatLanguage}</strong>
              <PencilLine size={18} />
            </div>
            <div className="language-selector">
              <button
                className="language-pill"
                onClick={() => setIsLanguageOpen((current) => !current)}
                type="button"
              >
                {selectedLanguage}
                <ChevronDown size={16} />
              </button>

              <AnimatePresence>
                {isLanguageOpen ? (
                  <motion.div
                    className="language-menu"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {languages.map((language) => (
                      <button
                        key={language}
                        className={selectedLanguage === language ? 'active' : ''}
                        onClick={() => {
                          setSelectedLanguage(language);
                          setIsLanguageOpen(false);
                        }}
                        type="button"
                      >
                        {language}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {isTranslatingUi ? (
                <motion.div
                  className="language-translation-status"
                  initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(8px)' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  Translating to {selectedLanguage}...
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="chatpage-side-card contact-card">
            <a className="contact-expert-button" href="tel:9587507407">
              {uiCopy.callExpert}
            </a>
            <div className="contact-marquee">
              <div className="contact-marquee-track">
                {uiCopy.contactMarquee.map((item) => (
                  <span key={`${selectedLanguage}-${item}`}>{item}</span>
                ))}
                {uiCopy.contactMarquee.map((item) => (
                  <span key={`${selectedLanguage}-repeat-${item}`}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.aside>
      </main>

      <div className="low-resource-note">
        <span>Visit this for </span>
        <a href="#low-resources">low-resource settings</a>
        <span>.</span>
      </div>
    </div>
  );
}

