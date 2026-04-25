import { AnimatePresence, motion } from 'motion/react';
import { Mail, UserRound } from 'lucide-react';
import { User } from '../types';

type UserProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenDashboard: () => void;
  onSignOut: () => void;
  user: User | null;
};

export function UserProfileModal({
  isOpen,
  onClose,
  onOpenDashboard,
  onSignOut,
  user,
}: UserProfileModalProps) {
  if (!user) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="profile-modal-shell"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="profile-modal-card">
              <button className="profile-modal-close" onClick={onClose} type="button">
                x
              </button>

              <div className="profile-modal-head">
                <div className="profile-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
                <div>
                  <p>Signed In User</p>
                  <h2>{user.username}</h2>
                </div>
              </div>

              <div className="profile-detail-grid">
                <div className="profile-detail-card">
                  <div>
                    <UserRound size={16} />
                    <span>Username</span>
                  </div>
                  <strong>{user.username}</strong>
                </div>

                <div className="profile-detail-card">
                  <div>
                    <Mail size={16} />
                    <span>Email</span>
                  </div>
                  <strong>{user.email}</strong>
                </div>

                <div className="profile-detail-card">
                  <div>
                    <span>Age</span>
                  </div>
                  <strong>{user.age} years</strong>
                </div>
              </div>

              <button
                className="profile-dashboard-button"
                onClick={() => {
                  onClose();
                  onOpenDashboard();
                }}
                type="button"
              >
                Dashboard
              </button>

              <button
                className="profile-signout-button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                type="button"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
