import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { MessageSquare, Chrome, Languages } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-border rounded-2xl p-10 shadow-xl relative z-10"
      >
        <div className="flex justify-end mb-4">
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-primary transition-colors uppercase tracking-wider"
          >
            <Languages size={14} />
            {i18n.language === 'en' ? 'हिंदी' : 'English'}
          </button>
        </div>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-text-main mb-2 tracking-tight">
            {t('app_name').split(' ')[0]} <span className="text-primary">{t('app_name').split(' ')[1]}</span>
          </h1>
          <p className="text-text-muted text-sm max-w-[280px]">
            {t('login_subtitle')}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-primary text-white hover:bg-primary/90 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group shadow-md"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Chrome className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {t('continue_google')}
            </>
          )}
        </button>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
            Digital Governance • Secure Redressal
          </p>
        </div>
      </motion.div>
    </div>
  );
}
