export type ChatUiCopy = {
  greetingPrefix: string;
  greetingFallback: string;
  statusOnline: string;
  updateIdle: string;
  updateReplying: string;
  updatesLoading: string;
  updatesTitle: string;
  updatesSubtitle: string;
  updatesError: string;
  updatesEmpty: string;
  updatesAlertsTitle: string;
  updatesNewsTitle: string;
  updatesDiscoveriesTitle: string;
  readMore: string;
  signInSavedChats: string;
  signIn: string;
  signUp: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  newChat: string;
  recentChats: string;
  noSavedChats: string;
  signInToSaveChats: string;
  starterHint: string;
  quickTools: string;
  emergencyGuidance: string;
  emergencyGuidancePrompt: string;
  savedResponses: string;
  savedResponsesPrompt: string;
  assistantTitle: string;
  introGreeting: string;
  introMessage: string;
  assistantReplyLabel: string;
  connectionIssue: string;
  thinkingMessage: string;
  inputPlaceholder: string;
  voiceInputWorking: string;
  healthTip: string;
  chatLanguage: string;
  callExpert: string;
  quickPrompts: string[];
  healthTips: string[];
  contactMarquee: string[];
};

export const defaultChatUiCopy: ChatUiCopy = {
  greetingPrefix: 'Namaste, {name}',
  greetingFallback: 'Namaste',
  statusOnline: 'Online - Ask me anything',
  updateIdle: 'New updates',
  updateReplying: 'Replying...',
  updatesLoading: 'Loading updates...',
  updatesTitle: 'Health updates',
  updatesSubtitle: 'Recent outbreaks, public-health news, and medical discoveries.',
  updatesError: 'Could not load updates right now.',
  updatesEmpty: 'No fresh updates found right now.',
  updatesAlertsTitle: 'Disease alerts',
  updatesNewsTitle: 'Health news',
  updatesDiscoveriesTitle: 'New discoveries',
  readMore: 'Read more',
  signInSavedChats: 'Sign in for saved chats',
  signIn: 'Sign in',
  signUp: 'Sign up',
  sidebarTitle: 'Chat Controls',
  sidebarSubtitle: 'Recent chats',
  newChat: 'New chat',
  recentChats: 'Recent chats',
  noSavedChats: 'No saved chats yet',
  signInToSaveChats: 'Sign in to save chats',
  starterHint: 'Ask about fever, weakness, or pain',
  quickTools: 'Quick tools',
  emergencyGuidance: 'Emergency guidance',
  emergencyGuidancePrompt: 'Show me danger signs I should not ignore.',
  savedResponses: 'Saved responses',
  savedResponsesPrompt: 'Give me a short care summary in simple language.',
  assistantTitle: 'Swasthya-Neeti',
  introGreeting: 'Namaste {name}!',
  introMessage: 'How can I assist you with your health today?',
  assistantReplyLabel: 'Swasthya-Neeti',
  connectionIssue: 'Connection issue',
  thinkingMessage: 'Thinking through the safest next steps...',
  inputPlaceholder: 'Type your health question here...',
  voiceInputWorking: 'Voice input working on it...',
  healthTip: 'Health Tip',
  chatLanguage: 'Chat Language',
  callExpert: 'Call Expert',
  quickPrompts: [
    'I have a fever and cold symptoms',
    'I have stomach pain since morning',
    'I feel weak and dizzy today',
  ],
  healthTips: [
    'Stay hydrated. Drink plenty of water throughout the day, especially if you have a fever or cold symptoms.',
    'Take rest and avoid overexertion when your body is fighting fever, weakness, or seasonal infection.',
    'Check your temperature regularly and seek medical help if fever keeps rising or lasts too long.',
    'Eat light, warm meals and monitor breathing, cough, and sore throat so worsening symptoms are not missed.',
  ],
  contactMarquee: [
    'Contact a nearby medical shop for medicines and basic supplies.',
    'Reach the nearest clinic for same-day consultation if symptoms increase.',
    'Go to the nearest hospital immediately for severe fever, breathing trouble, or danger signs.',
  ],
};

export function interpolate(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}
