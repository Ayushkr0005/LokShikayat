import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { MessageSquare, Chrome, Languages, Shield, User, Loader2, Key, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, code?: string} | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'citizen' | 'officer'>('citizen');
  const { t, i18n } = useTranslation();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'Citizen';
        await setDoc(doc(db, 'users', result.user.uid), {
          email: result.user.email,
          role: 'citizen',
          displayName,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Google Login Error:", err.code, err.message);
      setError({ message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', result.user.uid), {
          email: null,
          role: 'citizen',
          displayName: 'Guest User',
          isAnonymous: true,
          createdAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Anonymous Login Error:", err.code, err.message);
      setError({ message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isAdminMode) {
        if (email === 'admin' && password === 'admin123') {
          const adminEmail = 'admin@lokshikayat.system';
          const adminPass = 'admin123';
          try {
            await signInWithEmailAndPassword(auth, adminEmail, adminPass);
          } catch (signInErr: any) {
            if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
              const result = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
              await setDoc(doc(db, 'users', result.user.uid), {
                email: adminEmail,
                role: 'admin',
                displayName: 'System Administrator',
                createdAt: new Date().toISOString()
              });
            } else {
              throw signInErr;
            }
          }
          return;
        } else {
          throw new Error('Invalid Admin Credentials');
        }
      }

      if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', result.user.uid), {
          email,
          role,
          displayName: email.split('@')[0],
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      setError({ message: err.message, code: err.code });
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white border border-border rounded-[2.5rem] p-10 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <button 
            type="button"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setError(null);
            }}
            className={`p-2 rounded-xl transition-all ${isAdminMode ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 hover:text-primary'}`}
          >
            <Shield size={18} />
          </button>
          
          <button 
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em]"
          >
            <Languages size={14} />
            {i18n.language === 'en' ? 'हिन्दी' : 'English'}
          </button>
        </div>

        <div className="text-center mb-8 flex flex-col items-center">
          <motion.div 
            whileHover={{ rotate: 5, scale: 1.05 }}
            className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/30"
          >
            {isAdminMode ? <Shield className="w-10 h-10 text-white" /> : <MessageSquare className="w-10 h-10 text-white" />}
          </motion.div>
          <h1 className="text-3xl font-black text-text-main mb-2 tracking-tighter">
            {t('app_name').slice(0, 3)}<span className="text-primary">{t('app_name').slice(3)}</span>
          </h1>
          <p className="text-text-muted text-sm font-medium leading-relaxed max-w-[280px]">
            {isAdminMode ? 'Government Control Console' : t('login_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
              {isAdminMode ? t('admin_username') : t('email')}
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                required
                type={isAdminMode ? "text" : "email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isAdminMode ? "admin" : "alex@government.in"}
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-primary/20 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('password')}</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold focus:border-primary/20 focus:bg-white focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {!isAdminMode && mode === 'register' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('role')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setRole('citizen')}
                  className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${role === 'citizen' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                  {t('citizen')}
                </button>
                <button 
                  type="button"
                  onClick={() => setRole('officer')}
                  className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${role === 'officer' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                >
                  {t('officer')}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl text-sm font-black shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              isAdminMode ? 'Enter Console' : (mode === 'login' ? t('login') : t('create_account'))
            )}
          </button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col gap-3"
            >
              <div className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest p-4 rounded-xl text-center leading-relaxed">
                {error.code === 'auth/operation-not-allowed' ? (
                  <>
                    <AlertTriangle className="w-4 h-4 mx-auto mb-2" />
                    Sign-in method not enabled.
                  </>
                ) : (
                  error.message
                )}
              </div>

              {error.code === 'auth/operation-not-allowed' && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-[10px] text-amber-800 leading-relaxed font-bold">
                  <div className="flex items-center gap-2 mb-2 font-black text-amber-900">
                    <Info size={14} />
                    HOW TO FIX:
                  </div>
                  1. Visit Firebase Console.<br/>
                  2. Auth -&gt; Sign-in Method.<br/>
                  3. Enable <span className="underline">Email/Password</span> and <span className="underline">Google</span>.<br/>
                  4. Make sure project ID matches: <span className="bg-amber-200/50 px-1 rounded">{auth.app.options.projectId}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isAdminMode && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 bg-white px-4">OR</div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-slate-100 py-4 rounded-xl text-sm font-bold text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all group shadow-sm"
              >
                <Chrome className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {t('continue_google')}
              </button>

              <button 
                type="button"
                onClick={handleAnonymousLogin}
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-100 py-3 rounded-xl text-xs font-bold text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                Continue as Guest
              </button>
            </div>

            <div className="mt-8 text-center">
              <button 
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-xs font-bold text-slate-400 hover:text-primary transition-colors"
              >
                {mode === 'login' ? t('no_account') : t('has_account')}{' '}
                <span className="text-primary font-black underline decoration-2 underline-offset-4 ml-1">
                  {mode === 'login' ? t('register') : t('login')}
                </span>
              </button>
            </div>
          </>
        )}

        <div className="mt-10 pt-8 border-t border-slate-50 bg-slate-50/50 -mx-10 -mb-10 px-10 pb-10">
          <div className="text-[8px] font-mono text-slate-400 mb-4 break-all opacity-50">
            PID: {auth.app.options.projectId}
          </div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <User size={12} />
            {t('test_credentials')}
          </h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-primary uppercase tracking-widest">Admin</div>
                <div className="text-xs font-bold text-text-main">admin / admin123</div>
              </div>
              <Shield size={14} className="text-slate-300" />
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Officer</div>
                <div className="text-xs font-bold text-text-main">officer@test.com / 123456</div>
              </div>
              <Shield size={14} className="text-slate-300" />
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Citizen</div>
                <div className="text-xs font-bold text-text-main">citizen@test.com / 123456</div>
              </div>
              <User size={14} className="text-slate-300" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
