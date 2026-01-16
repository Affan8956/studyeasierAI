
import React, { useState, useEffect, useRef } from 'react';
import { login, signup, resendConfirmationEmail, sendPasswordResetEmail, updatePassword } from '../services/authService';
import { User } from '../types';

interface AuthFormProps {
  onAuthComplete: (user: User, token: string) => void;
  initialMode?: 'default' | 'reset_password';
}

const COOLDOWN_TIME = 60;
const POLLING_INTERVAL = 3000; // 3 seconds

type AuthStep = 'info' | 'waiting' | 'forgot_password' | 'forgot_sent' | 'reset_password';

const AuthForm: React.FC<AuthFormProps> = ({ onAuthComplete, initialMode = 'default' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<AuthStep>(initialMode === 'reset_password' ? 'reset_password' : 'info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedExpiry = localStorage.getItem('auth_resend_expiry');
    if (savedExpiry) {
      const remaining = Math.floor((parseInt(savedExpiry) - Date.now()) / 1000);
      if (remaining > 0) setTimer(remaining);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (step === 'waiting') {
      pollingRef.current = setInterval(async () => {
        try {
          const result = await login(email, password);
          if (result && result.user) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            onAuthComplete(result.user, result.token || '');
          }
        } catch (err) {
          // Silent catch for polling
        }
      }, POLLING_INTERVAL);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [step, email, password, onAuthComplete]);

  const startTimer = () => {
    const expiry = Date.now() + COOLDOWN_TIME * 1000;
    localStorage.setItem('auth_resend_expiry', expiry.toString());
    setTimer(COOLDOWN_TIME);
  };

  const getErrorMessage = (err: any) => {
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) return String(err.message);
    return 'Authentication failed. Please check your credentials.';
  };

  const validatePassword = (pass: string) => {
    if (pass.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!/[A-Z]/.test(pass) || !/[0-9]/.test(pass) || !/[^A-Za-z0-9]/.test(pass)) {
      throw new Error('Password must contain at least one uppercase letter, one digit, and one symbol.');
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        try {
          const result = await login(email, password);
          onAuthComplete(result.user, result.token || '');
        } catch (loginErr: any) {
          const msg = getErrorMessage(loginErr);
          if (msg === 'EMAIL_NOT_CONFIRMED') {
            setStep('waiting');
            startTimer();
          } else {
            throw loginErr;
          }
        }
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        validatePassword(password);

        try {
          await signup(name, email, password);
          setStep('waiting');
          startTimer();
        } catch (signupErr: any) {
          const msg = getErrorMessage(signupErr);
          if (msg === 'USER_ALREADY_EXISTS') {
            // Updated behavior: Switch to Login immediately
            setIsLogin(true);
            setError("Account already registered. Please log in.");
          } else {
            throw signupErr;
          }
        }
      }
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
       await sendPasswordResetEmail(email);
       setStep('forgot_sent');
    } catch (err: any) {
       setError(getErrorMessage(err));
    } finally {
       setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (password !== confirmPassword) throw new Error('Passwords do not match.');
      validatePassword(password);

      await updatePassword(password);
      
      // CLEANUP: Remove the hash with tokens so refresh doesn't trigger recovery mode again
      window.history.replaceState(null, '', window.location.pathname);
      
      // Notify parent that auth is effectively complete/updated
      onAuthComplete({ id: 'updated', email: '', name: '', preferences: { theme: 'dark', defaultMode: 'study' } }, 'updated');
      
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await resendConfirmationEmail(email);
      startTimer();
    } catch (err: any) {
      setError('Failed to resend. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setStep('info');
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-indigo-100 overflow-hidden">
        <div className="p-10 pb-6">
          <div className="flex justify-center mb-8">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl ${step === 'waiting' || step === 'forgot_sent' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-indigo-600 shadow-indigo-200'} transition-all duration-500`}>
              <i className={`fas ${step === 'waiting' || step === 'forgot_sent' ? 'fa-envelope-open-text' : step === 'forgot_password' ? 'fa-key' : step === 'reset_password' ? 'fa-shield-alt' : isLogin ? 'fa-lock' : 'fa-user-plus'} text-3xl`}></i>
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-center text-slate-900 mb-2 tracking-tight">
            {step === 'waiting' ? 'Verification Needed' : 
             step === 'forgot_password' ? 'Reset Password' :
             step === 'forgot_sent' ? 'Check Inbox' :
             step === 'reset_password' ? 'New Credentials' :
             isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-center text-slate-500 mb-10 font-medium">
            {step === 'waiting' ? `Check your inbox for ${email}` : 
             step === 'forgot_password' ? 'We will send a recovery link' :
             step === 'forgot_sent' ? `Recovery link sent to ${email}` :
             step === 'reset_password' ? 'Secure your account with a new password' :
             isLogin ? 'Access your intelligence modules' : 'Join the academic elite'}
          </p>

          {error && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-5 mb-8 rounded-r-2xl flex items-start gap-4 animate-fadeIn">
              <i className="fas fa-exclamation-circle mt-1"></i>
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {/* STANDARD LOGIN / SIGNUP FORM */}
          {step === 'info' && (
            <form onSubmit={handleInitialSubmit} className="space-y-6">
              {!isLogin && (
                <div className="animate-fadeIn">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">Full Name</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <i className="fas fa-user text-sm"></i>
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder=""
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">Email Address</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <i className="fas fa-envelope text-sm"></i>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">
                   {isLogin ? 'Password' : 'Secure Password'}
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <i className="fas fa-lock text-sm"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer z-10"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
                {isLogin && (
                   <div className="text-right mt-2">
                      <button 
                        type="button"
                        onClick={() => setStep('forgot_password')}
                        className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wide"
                      >
                         Forgot Password?
                      </button>
                   </div>
                )}
              </div>

              {!isLogin && (
                <div className="animate-fadeIn">
                  <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">Confirm Password</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                      <i className="fas fa-shield-alt text-sm"></i>
                    </span>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                    />
                     <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer z-10"
                      >
                        <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                      </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-wait mt-4 uppercase tracking-[0.2em] text-xs"
              >
                {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className={`fas ${isLogin ? 'fa-sign-in-alt' : 'fa-paper-plane'}`}></i>}
                {isLogin ? 'Log In' : 'Create Account'}
              </button>
            </form>
          )}
          
          {/* FORGOT PASSWORD FORM */}
          {step === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">Registered Email</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <i className="fas fa-envelope text-sm"></i>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-wait mt-4 uppercase tracking-[0.2em] text-xs"
              >
                {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                Send Reset Link
              </button>

              <button
                type="button"
                onClick={() => setStep('info')}
                className="w-full py-3 text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {step === 'reset_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-6 animate-fadeIn">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">
                   New Password
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <i className="fas fa-lock text-sm"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer z-10"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] ml-2">Confirm New Password</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <i className="fas fa-shield-alt text-sm"></i>
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-0 focus:border-indigo-600 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-300"
                  />
                   <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer z-10"
                    >
                      <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-wait mt-4 uppercase tracking-[0.2em] text-xs"
              >
                {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-save"></i>}
                Update Password
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD SENT STATE */}
          {step === 'forgot_sent' && (
             <div className="space-y-8 py-4 animate-fadeIn">
               <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 text-center relative overflow-hidden">
                 <p className="text-emerald-900 font-bold text-sm leading-relaxed relative z-10">
                   If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                 </p>
               </div>
               <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 w-full pt-4"
                >
                  <i className="fas fa-arrow-left"></i> Return to Login
                </button>
             </div>
          )}

          {/* EMAIL VERIFICATION WAITING STATE */}
          {step === 'waiting' && (
            <div className="space-y-8 py-4 animate-fadeIn">
              <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 text-center relative overflow-hidden">
                 <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
                 <p className="text-emerald-900 font-bold mb-6 text-sm leading-relaxed relative z-10">
                   A security link has been dispatched. Click it to activate your account, then return here.
                 </p>
                 <div className="flex flex-col items-center gap-4 relative z-10">
                    <div className="flex items-center gap-3 text-emerald-600 font-black uppercase tracking-[0.2em] text-[10px]">
                       <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                       </div>
                       Polling Server...
                    </div>
                 </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Didn't get the email?</p>
                
                <button 
                  type="button" 
                  onClick={handleResend} 
                  disabled={timer > 0 || loading}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${timer > 0 ? 'border-slate-50 text-slate-300 cursor-not-allowed' : 'border-emerald-600 text-emerald-600 hover:bg-emerald-50'}`}
                >
                  {timer > 0 ? `Retry in ${timer}s` : 'Resend Security Link'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('info')}
                  className="text-slate-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 w-full pt-4"
                >
                  <i className="fas fa-arrow-left"></i> Modify Details
                </button>
              </div>
            </div>
          )}
        </div>
        
        {step === 'info' && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm font-bold">
              {isLogin ? "New to the platform?" : "Already verified?"}
              <button
                onClick={toggleMode}
                className="ml-2 text-indigo-600 font-black hover:text-indigo-700 underline underline-offset-4 decoration-2"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
