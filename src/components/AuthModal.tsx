import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User } from '../types';
import { signInRequest, signUpRequest } from '../services/authApi';

type AuthMode = 'signin' | 'signup';

type AuthModalProps = {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onAuth: (user: User) => void;
};

const CURRENT_USER_KEY = 'swasthya_neeti_current_user';
const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

export function AuthModal({
  isOpen,
  initialMode = 'signin',
  onClose,
  onAuth,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError('');
    }
  }, [initialMode, isOpen]);

  const title = useMemo(
    () => (mode === 'signin' ? 'Sign in to continue' : 'Create your account'),
    [mode],
  );

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAge('');
    setGender('');
    setError('');
  };

  const closeModal = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'signin') {
      if (!username.trim() || !password.trim()) {
        setError('Username and password are required.');
        return;
      }
    }

    if (mode === 'signup' && (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !age.trim() || !gender.trim())) {
      setError('Please fill in all fields.');
      return;
    }

    if (mode === 'signup' && !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (mode === 'signup' && (Number.isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120)) {
      setError('Please enter a valid age.');
      return;
    }

    try {
      setIsSubmitting(true);
      const authenticatedUser: User =
        mode === 'signin'
          ? await signInRequest({
              username: username.trim(),
              password,
            })
          : await signUpRequest({
              username: username.trim(),
              email: email.trim(),
              password,
              confirmPassword,
              age: age.trim(),
              gender: gender.trim(),
            });

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(authenticatedUser));
      onAuth(authenticatedUser);
      closeModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="auth-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          />

          <motion.div
            className="auth-modal-shell"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="auth-modal-card">
              <button className="auth-modal-close" onClick={closeModal} type="button">
                x
              </button>

              <p className="auth-modal-kicker">Swasthya-Neeti Access</p>
              <h2>{title}</h2>
              <p className="auth-modal-subtext">
                {mode === 'signin'
                  ? 'Sign in with your username and password.'
                  : 'Sign up with your basic details to save your account.'}
              </p>

              <div className="auth-mode-tabs">
                <button
                  className={mode === 'signin' ? 'active' : ''}
                  onClick={() => {
                    if (isSubmitting) {
                      return;
                    }
                    setMode('signin');
                    setError('');
                  }}
                  disabled={isSubmitting}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className={mode === 'signup' ? 'active' : ''}
                  onClick={() => {
                    if (isSubmitting) {
                      return;
                    }
                    setMode('signup');
                    setError('');
                  }}
                  disabled={isSubmitting}
                  type="button"
                >
                  Sign Up
                </button>
              </div>

              <form className={mode === 'signup' ? 'auth-form auth-form-signup' : 'auth-form'} onSubmit={handleSubmit}>
                <label className={mode === 'signup' ? 'auth-field auth-field-full' : 'auth-field'}>
                  <span>Username</span>
                  <input
                    type="text"
                    value={username}
                    disabled={isSubmitting}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter username"
                  />
                </label>

                {mode === 'signup' ? (
                  <>
                    <label className="auth-field">
                      <span>Email</span>
                      <input
                        type="email"
                        value={email}
                        disabled={isSubmitting}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Enter email"
                      />
                    </label>

                    <label className="auth-field">
                      <span>Password</span>
                      <input
                        type="password"
                        value={password}
                        disabled={isSubmitting}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Create password"
                      />
                    </label>

                    <label className="auth-field">
                      <span>Confirm Password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        disabled={isSubmitting}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                      />
                    </label>

                    <label className="auth-field">
                      <span>Age</span>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={age}
                        disabled={isSubmitting}
                        onChange={(event) => setAge(event.target.value)}
                        placeholder="Enter age"
                      />
                    </label>

                    <label className="auth-field">
                      <span>Gender</span>
                      <select
                        value={gender}
                        disabled={isSubmitting}
                        onChange={(event) => setGender(event.target.value)}
                      >
                        <option value="">Select gender</option>
                        {genderOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="auth-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      disabled={isSubmitting}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                    />
                  </label>
                )}

                {error ? <p className="auth-form-error">{error}</p> : null}

                <button className="auth-submit-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export { CURRENT_USER_KEY };
