import { apiRequest, parseApiJson } from './api';
import type { ChatUiCopy } from './chatUiCopy';

export type ChatHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type ChatRequestUser = {
  email?: string;
  username?: string;
} | null;

export type RecentConversation = {
  conversationId: string;
  preview: string;
  language: string;
  updatedAt: string;
};

export type SavedConversationMessage = {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  language: string;
  content: string;
  createdAt: string;
};

export type HealthUpdateItem = {
  title: string;
  url: string;
  date: string;
  summary: string;
  source: string;
};

export async function transcribeAudioRequest(
  audioBlob: Blob,
  options?: { filename?: string; language?: string },
) {
  const formData = new FormData();
  formData.append('audio', audioBlob, options?.filename || 'recording.webm');
  if (options?.language) {
    formData.append('language', options.language);
  }

  const response = await apiRequest('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    text?: string;
  }>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to transcribe audio');
  }

  return data.text || '';
}

export async function sendChatMessageRequest(payload: {
  message: string;
  language: string;
  conversationId?: string;
  history: ChatHistoryMessage[];
  user: ChatRequestUser;
}) {
  const response = await apiRequest('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    conversationId: string;
    reply: string;
    model: string;
    suggestions: string[];
    saved: boolean;
  }>(response);
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to send chat message');
  }

  return data as {
    success: true;
    conversationId: string;
    reply: string;
    model: string;
    suggestions: string[];
    saved: boolean;
  };
}

export async function fetchRecentChats(userEmail: string) {
  const response = await apiRequest(`/api/chat/history?userEmail=${encodeURIComponent(userEmail)}`);
  const data = await parseApiJson<{ success?: boolean; error?: string; conversations?: RecentConversation[] }>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch recent chats');
  }

  return (data.conversations || []) as RecentConversation[];
}

export async function fetchConversationMessages(userEmail: string, conversationId: string) {
  const paths = [
    `/api/chat/conversation?userEmail=${encodeURIComponent(userEmail)}&conversationId=${encodeURIComponent(conversationId)}`,
    `/api/chat/history/${encodeURIComponent(conversationId)}?userEmail=${encodeURIComponent(userEmail)}`,
  ];

  let lastError: Error | null = null;

  for (const path of paths) {
    try {
      const response = await apiRequest(path);
      const data = await parseApiJson<{
        success?: boolean;
        error?: string;
        messages?: SavedConversationMessage[];
      }>(response);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch conversation messages');
      }

      return (data.messages || []) as SavedConversationMessage[];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to fetch conversation messages');
    }
  }

  throw lastError || new Error('Failed to fetch conversation messages');
}

export async function deleteConversation(userEmail: string, conversationId: string) {
  const response = await apiRequest(
    `/api/chat/conversation?userEmail=${encodeURIComponent(userEmail)}&conversationId=${encodeURIComponent(conversationId)}`,
    {
      method: 'DELETE',
    },
  );

  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    deletedCount?: number;
  }>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete conversation');
  }

  return {
    deletedCount: data.deletedCount || 0,
  };
}

export async function translateChatUi(language: string, copy: ChatUiCopy) {
  const response = await apiRequest('/api/chat/translate-ui', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      language,
      copy,
    }),
  });

  const data = await parseApiJson<{ success?: boolean; error?: string; copy: ChatUiCopy }>(response);
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to translate chat UI');
  }

  return data.copy as ChatUiCopy;
}

export async function fetchHealthUpdates() {
  const response = await apiRequest('/api/health-updates');
  const data = await parseApiJson<{
    success?: boolean;
    error?: string;
    fetchedAt: string;
    alerts: HealthUpdateItem[];
    news: HealthUpdateItem[];
    discoveries: HealthUpdateItem[];
    sources: {
      alerts: string;
      news: string;
      discoveries: string;
    };
  }>(response);

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch health updates');
  }

  return data as {
    success: true;
    fetchedAt: string;
    alerts: HealthUpdateItem[];
    news: HealthUpdateItem[];
    discoveries: HealthUpdateItem[];
    sources: {
      alerts: string;
      news: string;
      discoveries: string;
    };
  };
}
