import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Bookmark,
  ChartNoAxesColumn,
  ChevronRight,
  CircleHelp,
  Clock,
  Heart,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Settings,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import type { User } from '../types';
import { apiRequest, parseApiJson } from '../services/api';
import { fetchRecentChats, type RecentConversation } from '../services/chatApi';

type UserDashboardProps = {
  user: User | null;
  onSignOut: () => void;
  onChatSelect: (conversationId: string) => void;
};

type SavedGraph = {
  _id: string;
  filename: string;
  createdAt: string;
  metadata?: {
    title?: string;
  };
};

type DashboardRecord = {
  id: string;
  title: string;
  subtitle: string;
  icon: 'bookmark' | 'message';
};

type ReminderItem = {
  _id: string;
  label: string;
  description?: string;
  createdAt: string;
};

const chartBreakpoints = [
  { label: '1 May', start: 1, end: 3 },
  { label: '5 May', start: 4, end: 7 },
  { label: '10 May', start: 8, end: 12 },
  { label: '15 May', start: 13, end: 17 },
  { label: '20 May', start: 18, end: 22 },
  { label: '25 May', start: 23, end: 27 },
  { label: '30 May', start: 28, end: 31 },
];

function getInitials(username = '') {
  return username.trim().slice(0, 2).toUpperCase() || 'SN';
}

function formatDisplayDate(value?: string) {
  if (!value) {
    return 'Recently saved';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently saved';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatConversationTime(value?: string) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCompactConversationTime(value?: string) {
  if (!value) {
    return 'Today';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Today';
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getHealthScore(totalChats: number, savedRecords: number) {
  const activity = totalChats + savedRecords;

  if (activity >= 14) {
    return {
      label: 'Excellent',
      note: 'You are staying consistent.',
    };
  }

  if (activity >= 6) {
    return {
      label: 'Good',
      note: 'Keep it up!',
    };
  }

  return {
    label: 'Growing',
    note: 'A few more check-ins will help.',
  };
}

export function UserDashboard({ user, onSignOut, onChatSelect }: UserDashboardProps) {
  const [recentChats, setRecentChats] = useState<RecentConversation[]>([]);
  const [savedGraphs, setSavedGraphs] = useState<SavedGraph[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | null>(null);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    if (!user?.email) return;

    const fetchReminders = async () => {
      try {
        const response = await apiRequest(`/api/reminders?userEmail=${encodeURIComponent(user.email)}`);
        const data = await parseApiJson<{ success: boolean; reminders: ReminderItem[] }>(response);
        if (data.success) {
          setReminders(data.reminders || []);
        }
      } catch (err) {
        console.error('Failed to load reminders:', err);
      }
    };

    void fetchReminders();
  }, [user?.email]);

  const addReminder = async () => {
    if (!user?.email || !newLabel.trim()) return;

    try {
      const response = await apiRequest('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          userEmail: user.email,
          label: newLabel.trim(),
          description: newDescription.trim(),
        }),
      });

      const data = await parseApiJson<{ success: boolean; reminder: ReminderItem }>(response);
      if (data.success) {
        setReminders([data.reminder, ...reminders]);
        setNewLabel('');
        setNewDescription('');
        setIsAddTaskOpen(false);
      }
    } catch (err) {
      console.error('Failed to add reminder:', err);
    }
  };

  const removeReminder = async (id: string) => {
    if (!user?.email) return;

    try {
      const response = await apiRequest(`/api/reminders/${id}?userEmail=${encodeURIComponent(user.email)}`, {
        method: 'DELETE',
      });

      const data = await parseApiJson<{ success: boolean }>(response);
      if (data.success) {
        setReminders(reminders.filter((r) => r._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadDashboardData = async () => {
      if (!user?.email) {
        setRecentChats([]);
        setSavedGraphs([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const [recentChatData, graphResponse] = await Promise.all([
          fetchRecentChats(user.email).catch(() => []),
          apiRequest(`/api/graphs?userEmail=${encodeURIComponent(user.email)}`).catch(() => null),
        ]);

        if (isCancelled) {
          return;
        }

        setRecentChats(recentChatData);

        if (graphResponse) {
          const graphData = await parseApiJson<{
            success?: boolean;
            graphs?: SavedGraph[];
          }>(graphResponse);

          setSavedGraphs(graphData.success ? graphData.graphs || [] : []);
        } else {
          setSavedGraphs([]);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load dashboard data:', error);
          setRecentChats([]);
          setSavedGraphs([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isCancelled = true;
    };
  }, [user?.email]);

  const totalChats = recentChats.length;
  const savedRecords = savedGraphs.length;
  const activeDays = useMemo(
    () => new Set(recentChats.map((chat) => new Date(chat.updatedAt).toDateString())).size,
    [recentChats],
  );
  const healthScore = getHealthScore(totalChats, savedRecords);

  const savedRecordsList = useMemo<DashboardRecord[]>(() => {
    if (savedGraphs.length > 0) {
      return savedGraphs.slice(0, 3).map((graph) => ({
        id: graph._id,
        title: graph.metadata?.title || graph.filename.replace(/\.[^.]+$/, ''),
        subtitle: `Saved on ${formatDisplayDate(graph.createdAt)}`,
        icon: 'bookmark',
      }));
    }

    return recentChats.slice(0, 3).map((chat) => ({
      id: chat.conversationId,
      title: chat.preview,
      subtitle: `Saved on ${formatDisplayDate(chat.updatedAt)}`,
      icon: 'message',
    }));
  }, [recentChats, savedGraphs]);

  const chartData = useMemo(
    () =>
      chartBreakpoints.map((point) => {
        const value = recentChats.filter((chat) => {
          const date = new Date(chat.updatedAt);

          if (Number.isNaN(date.getTime())) {
            return false;
          }

          const day = date.getDate();
          return day >= point.start && day <= point.end;
        }).length;

        return {
          ...point,
          value,
        };
      }),
    [recentChats],
  );

  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-shell">
      <div className="dashboard-glow dashboard-glow-one" />
      <div className="dashboard-glow dashboard-glow-two" />
      <div className="dashboard-glow dashboard-glow-three" />

      <motion.header
        className="dashboard-topbar"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="dashboard-brand-lockup">
          <BrandLogo className="dashboard-brand-mark" imageClassName="dashboard-brand-mark-image" />
          <div>
            <p>AI CHATBOT FOR RURAL HEALTHCARE GUIDANCE</p>
            <h1>Swasthya-Neeti</h1>
          </div>
        </div>

        <div className="dashboard-topbar-actions">
          <a className="dashboard-live-link" href="#dashboard">
            Dashboard
            <LayoutDashboard size={16} />
          </a>
          <a className="dashboard-live-link" href="#chat-page">
            Live narrative
            <ChevronRight size={16} />
          </a>

          <button className="dashboard-user-chip" type="button">
            <span className="dashboard-user-chip-avatar">{getInitials(user.username)}</span>
            <span className="dashboard-user-chip-copy">
              <strong>{user.username}</strong>
              <small>View profile</small>
            </span>
          </button>
        </div>
      </motion.header>

      <main className="dashboard-layout">
        <motion.aside
          className="dashboard-sidebar"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <nav className="dashboard-sidebar-nav">
            <a className="dashboard-sidebar-item active" href="#dashboard">
              <LayoutDashboard size={18} />
              Dashboard
            </a>
            <a className="dashboard-sidebar-item" href="#dashboard-profile">
              <UserRound size={18} />
              My Profile
            </a>
            <a className="dashboard-sidebar-item" href="#dashboard-saved">
              <Bookmark size={18} />
              Saved Data
            </a>
            <a className="dashboard-sidebar-item" href="#dashboard-usage">
              <ChartNoAxesColumn size={18} />
              Usage Analytics
            </a>
            <a className="dashboard-sidebar-item" href="#dashboard-recent">
              <MessageSquare size={18} />
              Recent Chats
            </a>
          </nav>

          <div className="dashboard-sidebar-footer">
            <button className="dashboard-sidebar-item" type="button">
              <Settings size={18} />
              Settings
            </button>
            <button className="dashboard-sidebar-item" type="button">
              <CircleHelp size={18} />
              Help & Support
            </button>
          </div>

          <div className="dashboard-help-card">
            <p>Need Help Now?</p>
            <a className="dashboard-help-button" href="#chatpage">
              Start New Chat
            </a>
          </div>
        </motion.aside>

        <motion.section
          className="dashboard-main"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        >
          <motion.div 
            className="dashboard-hero"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <h2>Welcome back, {user.username}</h2>
              <p>Your health guidance companion, available 24x7.</p>
            </div>

            <button 
              className="dashboard-health-pill reminders-trigger-button" 
              onClick={() => setIsRemindersOpen(true)}
              type="button"
            >
              <Bell size={16} />
              Reminders
            </button>
          </motion.div>

          <AnimatePresence>
            {isRemindersOpen && (
              <div className="reminders-modal-backdrop">
                <motion.div 
                  className="reminders-modal-card is-landscape"
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                >
                  <div className="reminders-modal-header">
                    <div>
                      <h3>Health Management Dashboard</h3>
                      <p>Your medicine cycles, follow-up tasks, and health vitals</p>
                    </div>
                    <div className="reminders-header-actions">
                      <button className="reminders-add-button" onClick={() => setIsAddTaskOpen(true)}>
                        <Plus size={18} />
                        Assign New Task
                      </button>
                      <button className="reminders-close-button" onClick={() => setIsRemindersOpen(false)}>
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="reminders-landscape-grid">
                    {reminders.length > 0 ? (
                      reminders.map((reminder) => (
                        <motion.div 
                          key={reminder._id} 
                          className="reminder-card-item"
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="reminder-card-body">
                            <div className="reminder-card-icon">
                              <Clock size={20} />
                            </div>
                            <div className="reminder-card-content">
                              <strong>{reminder.label}</strong>
                              <p>{reminder.description || 'No additional notes provided.'}</p>
                              <small>Added on {formatDisplayDate(reminder.createdAt)}</small>
                            </div>
                          </div>
                          <button className="reminder-delete-btn" onClick={() => removeReminder(reminder._id)}>
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <div className="reminders-empty-landscape">
                        <Bell size={48} opacity={0.1} />
                        <p>Your health timeline is empty. <br /> Use the button above to assign your first task.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isAddTaskOpen && (
              <div className="sub-modal-backdrop">
                <motion.div 
                  className="sub-modal-card"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 50 }}
                >
                  <div className="sub-modal-header">
                    <h3>Assign New Health Task</h3>
                    <button onClick={() => setIsAddTaskOpen(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="sub-modal-form">
                    <div className="form-group">
                      <label>Task Label</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Morning Medicine, BP Check..." 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Notes / Description</label>
                      <textarea 
                        rows={3} 
                        placeholder="Additional details about this task..."
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                      />
                    </div>
                    <button className="form-submit-btn" onClick={addReminder}>
                      Save Task & Add to Dashboard
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="dashboard-overview-grid">
            <motion.section 
              className="dashboard-card dashboard-profile-card" 
              id="dashboard-profile"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="dashboard-card-head">
                <h3>Your Profile</h3>
                <button type="button">View &amp; edit</button>
              </div>

              <div className="dashboard-profile-summary">
                <div className="dashboard-profile-avatar">{getInitials(user.username)}</div>
                <div>
                  <strong>{user.username}</strong>
                  <span>Stay healthy, stay strong!</span>
                </div>
              </div>

              <div className="dashboard-profile-divider" />

              <div className="dashboard-profile-details">
                <div>
                  <span>
                    <Mail size={16} />
                    Email
                  </span>
                  <strong>{user.email}</strong>
                </div>
                <div>
                  <span>
                    <Phone size={16} />
                    Mobile
                  </span>
                  <strong>Not added yet</strong>
                </div>
                <div>
                  <span>
                    <UserRound size={16} />
                    Age
                  </span>
                  <strong>{user.age} Years</strong>
                </div>
                <div>
                  <span>
                    <Heart size={16} />
                    Gender
                  </span>
                  <strong>{user.gender || 'Not provided'}</strong>
                </div>
              </div>
            </motion.section>

            <motion.section 
              className="dashboard-card dashboard-stat-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="dashboard-stat-icon">
                <MessageSquare size={24} />
              </div>
              <div className="dashboard-stat-copy">
                <p>Total Chats</p>
                <strong>{totalChats}</strong>
                <span>This Month</span>
              </div>
            </motion.section>

            <motion.section 
              className="dashboard-card dashboard-stat-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="dashboard-stat-icon">
                <Heart size={24} />
              </div>
              <div className="dashboard-stat-copy">
                <p>Health Score</p>
                <strong>{healthScore.label}</strong>
                <span>{healthScore.note}</span>
              </div>
            </motion.section>
          </div>

          <div className="dashboard-content-grid">
            <motion.section 
              className="dashboard-card dashboard-list-card" 
              id="dashboard-saved"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="dashboard-card-head">
                <div>
                  <h3>Saved Data</h3>
                  <p>Your important health entries &amp; records</p>
                </div>
                <button type="button">View All</button>
              </div>

              <div className="dashboard-record-list">
                {savedRecordsList.length > 0 ? (
                  savedRecordsList.map((item) => (
                    <article 
                      className="dashboard-record-item interactive-record" 
                      key={item.id}
                      onClick={() => item.icon === 'message' && onChatSelect(item.id)}
                    >
                      <div className="dashboard-record-icon">
                        {item.icon === 'bookmark' ? <Bookmark size={18} /> : <MessageSquare size={18} />}
                      </div>
                      <div className="dashboard-record-copy">
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </div>
                      <ChevronRight size={18} />
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty-state">
                    {isLoading ? 'Loading your saved records...' : 'No saved records yet.'}
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section 
              className="dashboard-card dashboard-analytics-card" 
              id="dashboard-usage"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <div className="dashboard-card-head">
                <div>
                  <h3>Usage Analytics</h3>
                  <p>Your activity this month</p>
                </div>
                <button className="dashboard-analytics-range" type="button">
                  This Month
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="dashboard-analytics-stats">
                <div>
                  <strong>{totalChats}</strong>
                  <span>Chats Started</span>
                </div>
                <div>
                  <strong>{activeDays}</strong>
                  <span>Health Checks</span>
                </div>
                <div>
                  <strong>{savedRecords}</strong>
                  <span>Saved Records</span>
                </div>
              </div>

              <div className="dashboard-chart">
                <div className="dashboard-chart-axis">
                  <span>10</span>
                  <span>5</span>
                  <span>0</span>
                </div>
                <div className="dashboard-chart-bars">
                  {chartData.map((item) => (
                    <div className="dashboard-chart-column" key={item.label}>
                      <div className="dashboard-chart-bar-wrap">
                        <motion.span
                          className="dashboard-chart-bar"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${Math.max(18, item.value * 20)}px` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.5, ease: 'backOut' }}
                        />
                      </div>
                      <small>{item.label}</small>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            <motion.section 
              className="dashboard-card dashboard-chat-card" 
              id="dashboard-recent"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="dashboard-card-head">
                <div>
                  <h3>Recent Chats</h3>
                  <p>Your recent conversation with Run Neeti</p>
                </div>
              </div>

              <div className="dashboard-chat-list">
                {recentChats.length > 0 ? (
                  recentChats.slice(0, 3).map((chat) => (
                    <article 
                      className="dashboard-chat-item interactive-chat" 
                      key={chat.conversationId}
                      onClick={() => onChatSelect(chat.conversationId)}
                    >
                      <div className="dashboard-chat-item-left">
                        <div className="dashboard-record-icon">
                          <MessageSquare size={18} />
                        </div>
                        <strong>{chat.preview}</strong>
                      </div>
                      <div className="dashboard-chat-meta">
                        <span>{formatCompactConversationTime(chat.updatedAt)}</span>
                        <ChevronRight size={18} />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty-state">
                    {isLoading ? 'Loading recent chats...' : 'No recent chats yet.'}
                  </div>
                )}
              </div>
            </motion.section>

            <motion.section 
              className="dashboard-card dashboard-chat-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="dashboard-card-head">
                <div>
                  <h3>Account Snapshot</h3>
                  <p>Your recent conversations with Run Neeti</p>
                </div>
                <button type="button">View All Chats</button>
              </div>

              <div className="dashboard-chat-list">
                {recentChats.length > 0 ? (
                  recentChats.slice(0, 3).map((chat) => (
                    <article 
                      className="dashboard-chat-item interactive-chat" 
                      key={`${chat.conversationId}-snapshot`}
                      onClick={() => onChatSelect(chat.conversationId)}
                    >
                      <div className="dashboard-chat-item-left">
                        <div className="dashboard-record-icon">
                          <MessageSquare size={18} />
                        </div>
                        <div className="dashboard-chat-copy">
                          <strong>{chat.preview}</strong>
                          <span>{chat.language}</span>
                        </div>
                      </div>
                      <div className="dashboard-chat-meta">
                        <span>{formatConversationTime(chat.updatedAt)}</span>
                        <ChevronRight size={18} />
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty-state">
                    {isLoading ? 'Loading activity...' : 'No activity to show yet.'}
                  </div>
                )}
              </div>
            </motion.section>
          </div>

          <div className="dashboard-policy-footer">
            <button className="policy-link-btn" onClick={() => setPolicyModal('privacy')}>Privacy Policy</button>
            <span className="policy-dot" />
            <button className="policy-link-btn" onClick={() => setPolicyModal('terms')}>Terms & Conditions</button>
          </div>

          <AnimatePresence>
            {policyModal && (
              <div className="policy-modal-backdrop" onClick={() => setPolicyModal(null)}>
                <motion.div 
                  className="policy-modal-card"
                  onClick={e => e.stopPropagation()}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <div className="policy-modal-header">
                    <h3>{policyModal === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</h3>
                    <button onClick={() => setPolicyModal(null)}><X size={20}/></button>
                  </div>
                  <div className="policy-modal-content">
                    {policyModal === 'privacy' ? (
                      <div className="policy-text">
                        <h4>🔒 Privacy Policy (For Your Healthcare Chatbot)</h4>
                        <ol>
                          <li><strong>Introduction</strong><br/>This chatbot is designed to provide basic health guidance based on user input. We are committed to protecting user privacy and ensuring safe handling of information.</li>
                          <li><strong>Information We Collect</strong><br/>We may collect symptoms and health-related inputs provided by users, and basic interaction data (messages, timestamps). 👉 We do not require personal identification details unless explicitly provided.</li>
                          <li><strong>How We Use Information</strong><br/>The collected information is used only to understand user symptoms, provide appropriate health guidance, and improve system performance.</li>
                          <li><strong>Data Storage & Security</strong><br/>We aim to minimize data storage. Data is processed securely. Sensitive information is not stored permanently unless required.</li>
                          <li><strong>No Medical Diagnosis</strong><br/>This chatbot does not provide medical diagnosis or treatment. It only offers general guidance and risk assessment.</li>
                          <li><strong>User Responsibility</strong><br/>Users are advised to seek professional medical help for serious conditions and not rely solely on the chatbot for critical decisions.</li>
                          <li><strong>Data Sharing</strong><br/>We do not sell or share user data with third parties. Data may be used internally for system improvement.</li>
                          <li><strong>Consent</strong><br/>By using this chatbot, users agree to this privacy policy.</li>
                          <li><strong>Updates to Policy</strong><br/>This policy may be updated to improve privacy and compliance.</li>
                        </ol>
                        <div className="policy-disclaimer-box">
                          <strong>⚠️ Medical Disclaimer</strong>
                          <p>This chatbot provides general health guidance only and is not a substitute for professional medical advice.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="policy-text">
                        <h4>TERMS & CONDITIONS AND MEDICAL DISCLAIMER</h4>
                        <ol>
                          <li><strong>Nature of Service</strong><br/>Provides AI-generated informational content. Not a Medical Device. Not intended to diagnose, treat, or cure.</li>
                          <li><strong>No Doctor–Patient Relationship</strong><br/>Use of this platform does not create such a relationship.</li>
                          <li><strong>User Responsibility & Verification</strong><br/>Information must be independently verified by a certified medical practitioner. Do not rely on this for medication decisions or emergencies.</li>
                          <li><strong>No Blind Reliance Clause</strong><br/>You explicitly agree not to act solely on its outputs without professional verification.</li>
                          <li><strong>Limitation of Liability</strong><br/>The company is not liable for health complications or losses arising from reliance on the platform.</li>
                          <li><strong>No Medical Advice Warranty</strong><br/>Outputs are provided "as is" without warranties of accuracy.</li>
                          <li><strong>Emergency Disclaimer</strong><br/>NOT suitable for medical emergencies. Contact emergency services immediately.</li>
                          <li><strong>User Acknowledgment & Consent</strong><br/>By using the platform, you acknowledge AI limitations and assume full responsibility.</li>
                          <li><strong>Indemnification</strong><br/>You agree to hold harmless the developers from any claims arising from misuse.</li>
                          <li><strong>Jurisdiction</strong><br/>Subject to exclusive jurisdiction of competent courts.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                  <button className="policy-accept-btn" onClick={() => setPolicyModal(null)}>I Understand & Agree</button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </div>
  );
}
