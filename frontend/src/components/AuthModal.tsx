import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react';
import { login, register, forgotPassword, resetPassword, getCustomerToken } from '../lib/api';

type Mode = 'signin' | 'register' | 'forgot';

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (open) {
      setMode('signin');
      setError(null);
      setSuccess(null);
      setResetToken('');
      setNewPassword('');
    }
  }, [open]);

  useEffect(() => {
    if (getCustomerToken()) {
      onClose();
      navigate('/account');
    }
  }, [navigate, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
        onClose();
        navigate('/account');
        return;
      }
      if (mode === 'register') {
        await register({ email, password, firstName, lastName, phone });
        onClose();
        navigate('/account');
        return;
      }
      if (mode === 'forgot') {
        if (!resetToken) {
          const data = await forgotPassword(email);
          setResetToken(data.resetToken ?? '');
          setSuccess(data.message ?? 'Reset code generated.');
        } else {
          await resetPassword(email, resetToken, newPassword);
          setSuccess('Password updated. You can now sign in.');
          setMode('signin');
          setResetToken('');
          setNewPassword('');
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className='absolute inset-0 bg-black/80 backdrop-blur-sm'
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className='relative z-10 flex h-full max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-brand-900/95 shadow-2xl'
      >
        <button onClick={onClose} className='absolute right-4 top-4 z-20 rounded-full p-2 text-white/60 hover:bg-white/10'>
          <X className='h-5 w-5' />
        </button>

        <div className='flex-1 overflow-y-auto p-6 sm:p-8'>
          <div className='mb-6 flex rounded-2xl border border-white/10 bg-white/5 p-1'>
            {(['signin', 'register', 'forgot'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setSuccess(null);
                  setResetToken('');
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                  mode === m ? 'bg-white text-black' : 'text-white/70 hover:text-white'
                }`}
              >
                {m === 'signin' ? 'Sign in' : m === 'register' ? 'Register' : 'Reset'}
              </button>
            ))}
          </div>

          <AnimatePresence mode='wait'>
            <motion.div
              key={mode + (resetToken ? '-reset' : '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className='text-2xl font-bold text-white'>
                {mode === 'signin' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
              </h2>
              <p className='mt-1 text-sm text-white/60'>
                {mode === 'signin'
                  ? 'Sign in to view your orders and saved details.'
                  : mode === 'register'
                  ? 'Save your details and track every order in one place.'
                  : resetToken
                  ? 'Enter the reset code and your new password.'
                  : 'We will generate a reset code for your email.'}
              </p>

              {error && <p className='mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200'>{error}</p>}
              {success && (
                <p className='mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-3 text-sm text-emerald-200'>
                  <CheckCircle className='h-4 w-4' /> {success}
                </p>
              )}

              <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
                {mode === 'register' && (
                  <>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <label className='block'>
                        <span className='text-xs font-medium text-white/70'>First name</span>
                        <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                          <User className='h-4 w-4 text-white/40' />
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder='First'
                            className='w-full bg-transparent text-white outline-none placeholder-white/40'
                          />
                        </div>
                      </label>
                      <label className='block'>
                        <span className='text-xs font-medium text-white/70'>Last name</span>
                        <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                          <User className='h-4 w-4 text-white/40' />
                          <input
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder='Last'
                            className='w-full bg-transparent text-white outline-none placeholder-white/40'
                          />
                        </div>
                      </label>
                    </div>
                    <label className='block'>
                      <span className='text-xs font-medium text-white/70'>Phone</span>
                      <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                        <Phone className='h-4 w-4 text-white/40' />
                        <input
                          type='tel'
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder='+234 800 000 0000'
                          className='w-full bg-transparent text-white outline-none placeholder-white/40'
                        />
                      </div>
                    </label>
                  </>
                )}

                <label className='block'>
                  <span className='text-xs font-medium text-white/70'>Email</span>
                  <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                    <Mail className='h-4 w-4 text-white/40' />
                    <input
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='you@example.com'
                      required
                      className='w-full bg-transparent text-white outline-none placeholder-white/40'
                    />
                  </div>
                </label>

                {mode === 'signin' && (
                  <label className='block'>
                    <span className='text-xs font-medium text-white/70'>Password</span>
                    <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                      <Lock className='h-4 w-4 text-white/40' />
                      <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='••••••••'
                        required
                        minLength={6}
                        className='w-full bg-transparent text-white outline-none placeholder-white/40'
                      />
                    </div>
                  </label>
                )}

                {mode === 'register' && (
                  <label className='block'>
                    <span className='text-xs font-medium text-white/70'>Password</span>
                    <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                      <Lock className='h-4 w-4 text-white/40' />
                      <input
                        type='password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder='Choose a strong password'
                        required
                        minLength={6}
                        className='w-full bg-transparent text-white outline-none placeholder-white/40'
                      />
                    </div>
                  </label>
                )}

                {mode === 'forgot' && resetToken && (
                  <>
                    <div className='rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3'>
                      <p className='text-xs text-emerald-200'>Reset code</p>
                      <p className='mt-1 break-all text-sm font-mono text-white'>{resetToken}</p>
                    </div>
                    <label className='block'>
                      <span className='text-xs font-medium text-white/70'>New password</span>
                      <div className='mt-1 flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 p-3'>
                        <Lock className='h-4 w-4 text-white/40' />
                        <input
                          type='password'
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder='At least 6 characters'
                          required
                          minLength={6}
                          className='w-full bg-transparent text-white outline-none placeholder-white/40'
                        />
                      </div>
                    </label>
                  </>
                )}

                <button
                  type='submit'
                  disabled={loading}
                  className='mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-bold text-black transition hover:bg-white/90 disabled:opacity-60'
                >
                  {loading ? (
                    <Loader2 className='h-5 w-5 animate-spin' />
                  ) : (
                    <ArrowRight className='h-5 w-5' />
                  )}
                  {mode === 'signin'
                    ? 'Sign in'
                    : mode === 'register'
                    ? 'Create account'
                    : resetToken
                    ? 'Reset password'
                    : 'Get reset code'}
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className='mt-6 text-center text-sm text-white/60'>
            {mode === 'signin' && (
              <>
                <button onClick={() => setMode('forgot')} className='text-white underline'>
                  Forgot password?
                </button>
                <p className='mt-2'>
                  No account?{' '}
                  <button onClick={() => setMode('register')} className='text-white underline'>
                    Register
                  </button>
                </p>
              </>
            )}
            {mode === 'register' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('signin')} className='text-white underline'>
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && !resetToken && (
              <p>
                Remember your password?{' '}
                <button onClick={() => setMode('signin')} className='text-white underline'>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
