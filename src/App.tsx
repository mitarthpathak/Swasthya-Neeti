import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from 'motion/react';
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  HeartPulse,
  Languages,
  LayoutDashboard,
  MapPinned,
  Menu,
  PackagePlus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { AuthModal, CURRENT_USER_KEY } from './components/AuthModal';
import { BrandLogo } from './components/BrandLogo';
import { ChatPage } from './components/ChatPage';
import { ChatWorkspace } from './components/ChatWorkspace';
import { LowResources } from './components/LowResources';
import { UserDashboard } from './components/UserDashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { User } from './types';

type Chapter = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cardTitle?: string;
  cardDescription?: string;
  stat: string;
  detail: string;
  accent: string;
};

type KitPoint = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  badge: string;
};

type Feature = {
  title: string;
  body: string;
  icon: typeof Bot;
};

const kitPoints: KitPoint[] = [
  {
    id: 'language',
    eyebrow: 'About Swasthya-Neeti',
    title: 'Healthcare guidance, in your language, built for every village in Bharat.',
    body: 'Swasthya-Neeti is designed as a calm first-response AI assistant for rural families, ASHA workers, and caregivers who need immediate clarity before reaching a clinic.',
    badge: 'Village-first support',
  },
  {
    id: 'listen',
    eyebrow: 'Feature 01',
    title: 'Listen to symptoms in voice or text.',
    body: 'Patients can speak naturally in simple Hindi and regional languages. The system turns that into structured guidance without making the conversation feel technical.',
    badge: 'Multilingual intake',
  },
  {
    id: 'diagnose',
    eyebrow: 'Feature 02',
    title: 'Diagnose risk with safe triage cues.',
    body: 'The assistant explains what may be manageable at home, what warning signs matter, and when a real doctor or PHC visit should happen immediately.',
    badge: 'Safer next steps',
  },
  {
    id: 'heal',
    eyebrow: 'Feature 03',
    title: 'Heal through reminders, follow-up, and trust.',
    body: 'Medicine prompts, hydration reminders, and referral nudges help users move from confusion to action while keeping the advice simple and human.',
    badge: 'Medicine guidance',
  },
];

const chapters: Chapter[] = [
  {
    id: 'guide',
    eyebrow: 'Safe triage guidance',
    title: 'It explains what can be managed at home and what needs a real doctor now.',
    description:
      'The assistant surfaces red flags, medicine reminders, hydration guidance, and referral urgency with human-readable steps instead of generic chatbot replies.',
    cardTitle: 'Home care when safe. Doctor care when urgent.',
    cardDescription:
      'Red flags, hydration guidance, medicine reminders, and referral urgency are presented in simple, readable steps.',
    stat: 'Risk-aware next steps',
    detail: 'Every answer is shaped like practical guidance: what to do, what not to ignore, and when to escalate.',
    accent: '#0f8b8d',
  },
  {
    id: 'listen-story',
    eyebrow: 'Village-first intake',
    title: 'One conversation, even with patchy internet and low literacy.',
    description:
      'Swasthya-Neeti listens in simple Hindi and regional languages, converts voice into structured symptoms, and keeps the experience calm instead of clinical.',
    cardTitle: 'Even one short conversation can bring clarity.',
    cardDescription:
      'Simple Hindi and regional-language symptom capture turns voice into structured guidance without feeling too clinical.',
    stat: 'Voice, text, and assisted mode',
    detail: 'Built for ASHA workers, caregivers, and families who need clarity before confusion turns into panic.',
    accent: '#ff7a59',
  },
  {
    id: 'reach',
    eyebrow: 'Rural health network',
    title: 'It helps the last mile connect to clinics, camps, and government schemes.',
    description:
      'Location-aware prompts can steer people toward nearby PHCs, telemedicine windows, maternal care follow-ups, and vaccination opportunities.',
    cardTitle: 'From the village doorstep to the right care point.',
    cardDescription:
      'Nearby PHCs, telemedicine windows, maternal follow-ups, and vaccination routes can be surfaced with location-aware nudges.',
    stat: 'From advice to action',
    detail: 'The website story mirrors the product goal: less wandering, faster understanding, more trust.',
    accent: '#ffb703',
  },
  {
    id: 'bharat',
    eyebrow: 'Digital Bharat vision',
    title: "Inspired by India's public-health digitization push and Narendra Modi's focus on technology at scale.",
    description:
      'This narrative positions Swasthya-Neeti as a people-first layer on top of that larger ambition: AI that feels local, respectful, and useful in everyday health moments.',
    cardTitle: 'A Bharat-scale vision, expressed in a human way.',
    cardDescription:
      'The experience frames AI as local, respectful, and useful in everyday health moments rather than distant or overly futuristic.',
    stat: 'Human dignity meets AI access',
    detail: 'The message stays grounded in service, inclusion, and rural resilience rather than sounding futuristic for its own sake.',
    accent: '#4f772d',
  },
];

const features: Feature[] = [
  {
    title: 'Village health worker mode',
    body: 'Supports assisted conversations when an ASHA worker, volunteer, or caregiver is helping the patient.',
    icon: HeartPulse,
  },
  {
    title: 'Medicine and symptom nudges',
    body: 'Simple reminders for dosage timing, fever tracking, hydration, and recovery follow-up.',
    icon: PackagePlus,
  },
  {
    title: 'Trust-first escalation',
    body: 'Highlights danger signs clearly so serious cases move quickly toward a clinician.',
    icon: ShieldCheck,
  },
  {
    title: 'Language-native experience',
    body: 'Natural, local-language support for people who prefer speaking over typing.',
    icon: Languages,
  },
];

function getCurrentPageFromHash(hash: string) {
  if (hash === '#chat-page') {
    return 'chat';
  }

  if (hash === '#low-resources') {
    return 'low-resources';
  }

  if (hash === '#chatpage') {
    return 'chatpage';
  }

  if (hash.startsWith('#dashboard')) {
    return 'dashboard';
  }

  return 'home';
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = window.localStorage.getItem(CURRENT_USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentPage, setCurrentPage] = useState(() => getCurrentPageFromHash(window.location.hash));
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState(chapters[0].id);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const kitSectionRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: kitSectionRef,
    offset: ['start start', 'end end'],
  });
  const kitProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
  });

  const heroBoxRotate = useTransform(kitProgress, [0, 1], [-12, 4]);
  const heroBoxY = useTransform(kitProgress, [0, 0.35, 1], [0, -28, 104]);
  const heroBoxScale = useTransform(kitProgress, [0, 0.38, 0.7, 1], [1.08, 1.12, 0.95, 0.82]);
  const lidRotate = useTransform(kitProgress, [0, 0.15, 0.36, 1], [0, 0, -160, -168]);
  const shellDepth = useTransform(kitProgress, [0.2, 0.55, 1], [1, 0.96, 0.88]);
  const componentAlpha = useTransform(kitProgress, [0.38, 0.55, 0.85], [0, 1, 1]);
  const componentLift = useTransform(kitProgress, [0.38, 0.65, 1], [56, -18, -64]);
  const componentSpread = useTransform(kitProgress, [0.4, 0.7, 1], [0, 1, 1.42]);
  const backGlow = useTransform(kitProgress, [0, 0.5, 1], [0.35, 0.55, 0.2]);
  const kitSpreadScale = viewportWidth <= 640 ? 0.48 : viewportWidth <= 1080 ? 0.72 : 1;
  const bottleX = useTransform(componentSpread, [0, 1.42], [0, -214 * kitSpreadScale]);
  const stripX = useTransform(componentSpread, [0, 1.42], [0, -78 * kitSpreadScale]);
  const stripRotate = useTransform(componentSpread, [0, 1.42], [0, -16]);
  const cardX = useTransform(componentSpread, [0, 1.42], [0, 142 * kitSpreadScale]);
  const cardRotate = useTransform(componentSpread, [0, 1.42], [0, 11]);
  const chatX = useTransform(componentSpread, [0, 1.42], [0, 236 * kitSpreadScale]);
  const stethoX = useTransform(componentSpread, [0, 1.42], [0, 58 * kitSpreadScale]);
  const stethoRotate = useTransform(componentSpread, [0, 1.42], [0, 18]);
  const isCompactHeader = viewportWidth <= 720;

  useEffect(() => {
    const syncPageWithHash = () => {
      setCurrentPage(getCurrentPageFromHash(window.location.hash));
    };

    syncPageWithHash();
    window.addEventListener('hashchange', syncPageWithHash);

    return () => window.removeEventListener('hashchange', syncPageWithHash);
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isCompactHeader && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isCompactHeader, isMobileMenuOpen]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setIsMobileMenuOpen(false);
  }, [currentPage]);

  useEffect(() => {
    const isProtectedPage =
      currentPage === 'chatpage' || currentPage === 'low-resources' || currentPage === 'dashboard';
    if (!isProtectedPage || user) {
      return;
    }

    setAuthMode('signin');
    setIsAuthModalOpen(true);

    if (window.location.hash !== '#chat-page') {
      window.location.hash = '#chat-page';
    } else {
      setCurrentPage('chat');
    }
  }, [currentPage, user]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) {
          setActiveChapter(visible.target.id);
        }
      },
      {
        threshold: [0.35, 0.55, 0.75],
        rootMargin: '-10% 0px -25% 0px',
      },
    );

    const elements = chapters
      .map((chapter) => document.getElementById(chapter.id))
      .filter((element): element is HTMLElement => Boolean(element));

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const activeData = chapters[Math.max(chapters.findIndex((chapter) => chapter.id === activeChapter), 0)];

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const openDashboard = () => {
    window.location.hash = '#dashboard';
  };

  if (currentPage === 'chat') {
    return (
      <>
        <ChatPage
          isSignedIn={Boolean(user)}
          onBack={() => {
            setSelectedConversationId(null);
            window.location.hash = '';
          }}
          onRequireAuth={openAuthModal}
        />
        <AuthModal
          initialMode={authMode}
          isOpen={isAuthModalOpen}
          onAuth={setUser}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  if (currentPage === 'chatpage') {
    return (
      <>
        <ChatWorkspace
          onBackHome={() => {
            setSelectedConversationId(null);
            window.location.hash = '';
          }}
          onOpenAuth={openAuthModal}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          user={user}
          initialConversationId={selectedConversationId}
        />
        <AuthModal
          initialMode={authMode}
          isOpen={isAuthModalOpen}
          onAuth={setUser}
          onClose={() => setIsAuthModalOpen(false)}
        />
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onOpenDashboard={openDashboard}
          onSignOut={() => {
            localStorage.removeItem(CURRENT_USER_KEY);
            setUser(null);
          }}
          user={user}
        />
      </>
    );
  }

  if (currentPage === 'low-resources') {
    return (
      <>
        <LowResources
          onBackHome={() => (window.location.hash = '')}
          onOpenAuth={openAuthModal}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          user={user}
        />
        <AuthModal
          initialMode={authMode}
          isOpen={isAuthModalOpen}
          onAuth={setUser}
          onClose={() => setIsAuthModalOpen(false)}
        />
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onOpenDashboard={openDashboard}
          onSignOut={() => {
            localStorage.removeItem(CURRENT_USER_KEY);
            setUser(null);
          }}
          user={user}
        />
      </>
    );
  }

  if (currentPage === 'dashboard') {
    return (
      <>
        <UserDashboard
          onSignOut={() => {
            setSelectedConversationId(null);
            localStorage.removeItem(CURRENT_USER_KEY);
            setUser(null);
            window.location.hash = '';
          }}
          user={user}
          onChatSelect={(id) => {
            setSelectedConversationId(id);
            window.location.hash = '#chatpage';
          }}
        />
        <AuthModal
          initialMode={authMode}
          isOpen={isAuthModalOpen}
          onAuth={setUser}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="site-shell" id="top">
        <motion.header
          className={isMobileMenuOpen ? 'topbar menu-open' : 'topbar'}
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        >
          <motion.div
            className="brand-lockup"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <BrandLogo className="topbar-brand-mark" imageClassName="topbar-brand-mark-image" />
            <div>
              <p className="brand-kicker">AI Chatbot for Rural Healthcare Guidance</p>
              <h1 className="brand-name">Swasthya-Neeti</h1>
            </div>
          </motion.div>

          {isCompactHeader ? (
            <>
              <button
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="mobile-menu-button auth-button-reset"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                type="button"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <AnimatePresence initial={false}>
                {isMobileMenuOpen && (
                  <motion.div
                    className="topbar-mobile-dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    {user && (
                      <a
                        className="topbar-link"
                        href="#dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Dashboard
                        <LayoutDashboard size={16} />
                      </a>
                    )}
                    <a
                      className="topbar-link"
                      href="#chat-page"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Live narrative
                      <ArrowUpRight size={16} />
                    </a>
                    {user ? (
                      <button
                        className="profile-chip-button mobile-profile-button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsProfileModalOpen(true);
                        }}
                        type="button"
                      >
                        <span className="profile-chip-avatar">
                          {user.username.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="profile-chip-copy">
                          <strong>{user.username}</strong>
                          <small>View profile</small>
                        </span>
                      </button>
                    ) : (
                      <>
                        <button
                          className="auth-link auth-button-reset"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            openAuthModal('signin');
                          }}
                          type="button"
                        >
                          Sign in
                        </button>
                        <button
                          className="auth-button auth-button-reset"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            openAuthModal('signup');
                          }}
                          type="button"
                        >
                          Sign up
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <motion.div
              className="topbar-actions"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
            >
              {user && (
                <a className="topbar-link" href="#dashboard">
                  Dashboard
                  <LayoutDashboard size={16} />
                </a>
              )}
              <a className="topbar-link" href="#chat-page">
                Live narrative
                <ArrowUpRight size={16} />
              </a>
              {user ? (
                <button
                  className="profile-chip-button"
                  onClick={() => setIsProfileModalOpen(true)}
                  type="button"
                >
                  <span className="profile-chip-avatar">
                    {user.username.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="profile-chip-copy">
                    <strong>{user.username}</strong>
                    <small>View profile</small>
                  </span>
                </button>
              ) : (
                <>
                  <button
                    className="auth-link auth-button-reset"
                    onClick={() => openAuthModal('signin')}
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    className="auth-button auth-button-reset"
                    onClick={() => openAuthModal('signup')}
                    type="button"
                  >
                    Sign up
                  </button>
                </>
              )}
            </motion.div>
          )}
        </motion.header>

        <main>
        <section className="hero-section">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
          >
            <motion.p
              className="eyebrow"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
            >
              Healthcare guidance, in your language
            </motion.p>
            <motion.p
              className="hero-intro"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3 }}
            >
              built for every village in Bharat.
            </motion.p>
            <div className="hero-words">
              {['Listen.', 'Diagnose.', 'Heal.'].map((word, index) => (
                <motion.h2
                  key={word}
                  className={word === 'Heal.' ? 'accent-word' : undefined}
                  initial={{ opacity: 0, y: 60, filter: 'blur(12px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.8, delay: 0.36 + index * 0.12, ease: 'easeOut' }}
                >
                  {word}
                </motion.h2>
              ))}
            </div>
            <motion.p
              className="hero-text"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              A rural health AI assistant that speaks simply, triages carefully, and helps
              families act faster with more confidence.
            </motion.p>
            <motion.a
              className="scroll-cue"
              href="#kit-story"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.72 }}
              whileHover={{ x: 6 }}
            >
              <ChevronDown size={18} />
              Scroll to open the medical kit
            </motion.a>
          </motion.div>

          <div className="hero-visual-shell">
            <div className="hero-visual-backdrop" />
            <motion.div
              className="medical-box hero-box"
              style={{ rotate: heroBoxRotate, y: heroBoxY, scale: heroBoxScale }}
            >
              <div className="box-shadow" />
              <div className="box-back-shell" />
              <div className="box-hinge hinge-left" />
              <div className="box-hinge hinge-right" />
              <motion.div className="box-lid" style={{ rotateX: lidRotate }}>
                <div className="lid-handle" />
                <div className="lid-latch left" />
                <div className="lid-latch right" />
                <div className="cross-mark horizontal" />
                <div className="cross-mark vertical" />
              </motion.div>
              <motion.div className="box-base" style={{ scale: shellDepth }}>
                <div className="box-rim" />
                <div className="box-inner-shadow" />
                <div className="box-organizer organizer-left" />
                <div className="box-organizer organizer-center" />
                <div className="box-organizer organizer-right" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className="kit-story" id="kit-story" ref={kitSectionRef}>
          <div className="kit-story-copy">
            {kitPoints.map((point, index) => (
              <motion.article
                key={point.id}
                className="kit-copy-card"
                initial={{ opacity: 0, y: 54, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.28 }}
                transition={{ duration: 0.75, delay: index * 0.08 }}
              >
                <span className="story-index">0{index + 1}</span>
                <p className="story-eyebrow">{point.eyebrow}</p>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
                <div className="story-stat">{point.badge}</div>
              </motion.article>
            ))}

            <section className="features-section compact-features">
              <div className="section-heading">
                <p className="eyebrow">Feature snapshot</p>
                <h3>Useful in the first health conversation, not after the user gives up.</h3>
              </div>

              <div className="feature-grid">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <motion.article
                      key={feature.title}
                      className="feature-card"
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.55 }}
                    >
                      <div className="feature-icon">
                        <Icon size={22} />
                      </div>
                      <h4>{feature.title}</h4>
                      <p>{feature.body}</p>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="kit-story-visual">
            <div className="kit-visual-frame">
              <motion.div className="kit-glow-ring" style={{ opacity: backGlow }} />
              <motion.div
                className="medical-box sticky-box"
                style={{ rotate: heroBoxRotate, scale: heroBoxScale }}
              >
                <div className="box-shadow" />
                <div className="box-back-shell" />
                <div className="box-hinge hinge-left" />
                <div className="box-hinge hinge-right" />
                <motion.div className="box-lid" style={{ rotateX: lidRotate }}>
                  <div className="lid-handle" />
                  <div className="lid-latch left" />
                  <div className="lid-latch right" />
                  <div className="cross-mark horizontal" />
                  <div className="cross-mark vertical" />
                </motion.div>
                <motion.div className="box-base" style={{ scale: shellDepth }}>
                  <div className="box-rim" />
                  <div className="box-inner-shadow" />
                  <div className="box-organizer organizer-left" />
                  <div className="box-organizer organizer-center" />
                  <div className="box-organizer organizer-right" />
                </motion.div>

                <motion.div
                  className="kit-item item-bottle"
                  style={{ opacity: componentAlpha, y: componentLift, x: bottleX }}
                >
                  <div className="item-top" />
                </motion.div>
                <motion.div
                  className="kit-item item-strip"
                  style={{ opacity: componentAlpha, y: componentLift, x: stripX, rotate: stripRotate }}
                />
                <motion.div
                  className="kit-item item-card"
                  style={{ opacity: componentAlpha, y: componentLift, x: cardX, rotate: cardRotate }}
                >
                  <span />
                  <span />
                  <span />
                </motion.div>
                <motion.div
                  className="kit-item item-chat"
                  style={{ opacity: componentAlpha, y: componentLift, x: chatX }}
                >
                  <Bot size={22} />
                </motion.div>
                <motion.div
                  className="kit-item item-stetho"
                  style={{ opacity: componentAlpha, y: componentLift, x: stethoX, rotate: stethoRotate }}
                >
                  <Stethoscope size={22} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="story-grid" id="narrative">
          <div className="story-sticky">
            <div className="sticky-frame">
              <p className="sticky-label">Live narrative</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeData.id}
                  initial={{ opacity: 0, y: 22, filter: 'blur(10px)', rotate: -2 }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotate: 0 }}
                  exit={{ opacity: 0, y: -18, filter: 'blur(8px)', rotate: 1.5 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                  <h3>{activeData.title}</h3>
                  <p>{activeData.detail}</p>
                </motion.div>
              </AnimatePresence>

              <div className="signal-board">
                <div>
                  <span>Current chapter</span>
                  <strong>{activeData.eyebrow}</strong>
                </div>
                <div>
                  <span>Focus</span>
                  <strong>{activeData.stat}</strong>
                </div>
              </div>

              <div className="chapter-dots" aria-hidden="true">
                {chapters.map((chapter) => (
                  <span
                    key={chapter.id}
                    className={chapter.id === activeChapter ? 'chapter-dot active' : 'chapter-dot'}
                    style={{ backgroundColor: chapter.id === activeChapter ? chapter.accent : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="story-steps">
            {chapters.map((chapter, index) => (
              <motion.article
                key={chapter.id}
                id={chapter.id}
                className="story-card"
                initial={{ opacity: 0, x: index % 2 === 0 ? 60 : -60, y: 40, rotate: index % 2 === 0 ? 4 : -4, filter: 'blur(12px)' }}
                whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <span className="story-index">0{index + 1}</span>
                <p className="story-eyebrow">{chapter.eyebrow}</p>
                <h3>{chapter.cardTitle || chapter.title}</h3>
                <p>{chapter.cardDescription || chapter.description}</p>
                <div className="story-stat">{chapter.stat}</div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="vision-section" id="vision">
          <motion.div
            className="vision-copy"
            initial={{ opacity: 0, x: -56, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: 0.85 }}
          >
            <p className="eyebrow">National context</p>
            <h3>Built to feel aligned with India's digital health momentum.</h3>
            <p>
              The vision block references Narendra Modi in a measured way, positioning
              Swasthya-Neeti inside the larger story of digital public infrastructure,
              healthcare access, and technology reaching rural India at scale.
            </p>
          </motion.div>

          <motion.div
            className="vision-panel"
            initial={{ opacity: 0, x: 72, filter: 'blur(12px)' }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.32 }}
            transition={{ duration: 0.85, delay: 0.1 }}
            whileHover={{ y: -4, scale: 1.01 }}
          >
            <Sparkles size={20} />
            <p>
              "From digital governance to digital health, the next leap is making intelligence
              usable in villages, not just visible in cities."
            </p>
            <div className="vision-meta">
              <span>Positioning note</span>
              <strong>Grounded, inclusive, Bharat-first</strong>
            </div>
          </motion.div>
        </section>

        <section className="cta-section">
          <motion.div
            className="cta-panel"
            initial={{ opacity: 0, x: 120, filter: 'blur(18px)', scale: 0.94 }}
            whileInView={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.95, ease: 'easeOut' }}
            whileHover={{ y: -8, scale: 1.015, filter: 'blur(0px)' }}
          >
            <MapPinned size={22} />
            <p className="eyebrow">Final frame</p>
            <h3>From symptom confusion to calm action.</h3>
            <p>
              Swasthya-Neeti now opens with a 3D medical kit story, reveals its capabilities as
              the box unfolds, and keeps the live narrative section later in the experience.
            </p>
            <div className="cta-actions">
              <a className="button-primary" href="#chat-page">
                Open chat page
              </a>
              <a className="auth-link cta-secondary" href="#top">
                Back to top
              </a>
            </div>
          </motion.div>
        </section>
        </main>

        <div className="low-resource-note">
          <span>Visit this for </span>
          <a href="#low-resources">low-resource settings</a>
          <span>.</span>
        </div>
      </div>

      <AuthModal
        initialMode={authMode}
        isOpen={isAuthModalOpen}
        onAuth={setUser}
        onClose={() => setIsAuthModalOpen(false)}
      />
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenDashboard={openDashboard}
        onSignOut={() => {
          localStorage.removeItem(CURRENT_USER_KEY);
          setUser(null);
        }}
        user={user}
      />
    </>
  );
}
