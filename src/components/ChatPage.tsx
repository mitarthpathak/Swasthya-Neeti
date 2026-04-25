import { motion } from 'motion/react';
import {
  ArrowLeft,
  HeartPulse,
  MoveRight,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

type ChatPageProps = {
  onBack: () => void;
  isSignedIn: boolean;
  onRequireAuth: (mode?: 'signin' | 'signup') => void;
};

export function ChatPage({ onBack, isSignedIn, onRequireAuth }: ChatPageProps) {
  return (
    <div className="chat-page-shell">
      <div className="chat-page-orb orb-one" />
      <div className="chat-page-orb orb-two" />

      <motion.header
        className="chat-topbar"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <button className="chat-back-button" onClick={onBack} type="button">
          <ArrowLeft size={18} />
          Back to narrative
        </button>

        <div className="chat-brand-lockup">
          <p>AI health assistant built for rural India.</p>
          <strong>Swasthya-Neeti Chat</strong>
        </div>

        <button
          className="chat-live-chip"
          onClick={() => {
            if (isSignedIn) {
              window.location.hash = '#chatpage';
              return;
            }

            if (!isSignedIn) {
              onRequireAuth('signin');
            }
          }}
          type="button"
        >
          Live assistant
          <MoveRight size={16} />
        </button>
      </motion.header>

      <main className="chat-page-layout">
        <section className="chat-hero-panel">
          <motion.div
            className="chat-alert-marquee"
            initial={{ opacity: 0, y: -18, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="chat-alert-track">
              <span>Sign in to use the chatbot, save your health account, and continue into the full assistant workspace.</span>
              <span>Sign in to use the chatbot, save your health account, and continue into the full assistant workspace.</span>
            </div>
          </motion.div>

          <motion.div
            className="chat-hero-copy"
            initial={{ opacity: 0, x: -36, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
          >
            <p className="chat-kicker">Voice-first healthcare guidance</p>
            <h1>
              Chat that feels
              <span> calm, local, and actionable.</span>
            </h1>
            <p className="chat-hero-text">
              A graphical triage experience for families, caregivers, and ASHA workers. It
              listens in everyday language, highlights danger signs, and responds with steps
              that are easier to trust.
            </p>

            <div className="chat-hero-actions">
              <button
                className="chat-primary-action"
                onClick={() => {
                  if (isSignedIn) {
                    window.location.hash = '#chatpage';
                    return;
                  }

                  if (!isSignedIn) {
                    onRequireAuth('signin');
                  }
                }}
                type="button"
              >
                Open assistant
              </button>
              <a className="chat-secondary-action" href="#care-flow">
                See care flow
              </a>
            </div>
          </motion.div>

          <motion.div
            className="chat-visual-column"
            initial={{ opacity: 0, x: 24, filter: 'blur(14px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.08, ease: 'easeOut' }}
          >
            <motion.div
              className="chat-visual-stage"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 6.8, ease: 'easeInOut' }}
            >
              <div className="chat-stage-grid" />

              <motion.div
                className="pulse-shell"
                animate={{ rotate: [0, 6, -4, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
              >
                <motion.div
                  className="pulse-ring ring-one"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.75, 0.45] }}
                  transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
                />
                <motion.div
                  className="pulse-ring ring-two"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 4.4, ease: 'easeInOut', delay: 0.3 }}
                />
                <div className="pulse-core">
                  <HeartPulse size={52} />
                </div>
              </motion.div>

              <motion.div
                className="floating-graph-card primary"
                animate={{ y: [0, -14, 0], rotate: [-6, -2, -6] }}
                transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut' }}
              >
                <span className="graph-card-label">Live risk map</span>
                <div className="graph-lines">
                  <i />
                  <i />
                  <i />
                </div>
              </motion.div>

              <motion.div
                className="floating-graph-card secondary"
                animate={{ y: [0, 10, 0], rotate: [8, 3, 8] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              >
                <Stethoscope size={24} />
                <strong>Clinic-ready summary</strong>
                <p>Symptoms, timing, urgency, medicine history</p>
              </motion.div>

              <motion.div
                className="floating-graph-card tertiary"
                animate={{ x: [0, 12, 0], y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }}
              >
                <Sparkles size={20} />
                <strong>Village-first AI</strong>
              </motion.div>

              <motion.div
                className="floating-graph-card quaternary"
                animate={{ x: [0, -12, 0], y: [0, 8, 0], rotate: [3, -2, 3] }}
                transition={{ repeat: Infinity, duration: 5.8, ease: 'easeInOut' }}
              >
                <span className="graph-card-label">Rapid triage</span>
                <strong>Voice to action</strong>
                <p>Listen, detect urgency, guide the next step.</p>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            className="escalation-panel hero-escalation-panel"
            id="care-flow"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
          >
            <div className="escalation-header">
              <ShieldAlert size={20} />
              <span>Danger sign escalation</span>
            </div>
            <h3>If fever rises, breathing worsens, or confusion starts, refer immediately.</h3>
            <p>
              This panel is designed to make red-flag guidance impossible to miss even for
              first-time users.
            </p>
            <a href="tel:9587507407">
              Call Expert
              <PhoneCall size={16} />
            </a>
          </motion.div>
        </section>
      </main>

      <div className="low-resource-note">
        <span>Visit this for </span>
        <a href="#low-resources">low-resource settings</a>
        <span>.</span>
      </div>
    </div>
  );
}
