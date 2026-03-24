import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
const LOCALE_STORAGE_KEY = 'app_locale';

const COPY = {
  en: {
    enterEmail: 'Please enter your email',
    resetSent: 'Reset code sent! Check your email.',
    resetFailed: 'Failed to send reset code',
    title: 'Forgot Password?',
    subtitle: "We'll send you a reset code",
    labelEmail: 'Email',
    buttonSending: 'Sending...',
    buttonSendCode: 'Send Reset Code',
    checkEmailTitle: 'Check Your Email',
    checkEmailSubtitlePrefix: 'We sent a 6-digit reset code to',
    buttonEnterCode: 'Enter Reset Code',
    buttonTryDifferent: 'Try Different Email',
    rememberPassword: 'Remember your password?',
    backSignIn: 'Back to Sign In',
    backHome: '← Back to Home',
  },
  ru: {
    enterEmail: 'Введите свой адрес электронной почты',
    resetSent: 'Код для сброса пароля отправлен! Проверьте свою почту.',
    resetFailed: 'Не удалось отправить код сброса',
    title: 'Забыли пароль?',
    subtitle: 'Мы вышлем вам код сброса',
    labelEmail: 'Электронная почта',
    buttonSending: 'Отправляется...',
    buttonSendCode: 'Отправить код сброса',
    checkEmailTitle: 'Проверьте свою электронную почту',
    checkEmailSubtitlePrefix: 'Мы отправили 6-значный код сброса на',
    buttonEnterCode: 'Введите код сброса',
    buttonTryDifferent: 'Попробуйте другой адрес электронной почты',
    rememberPassword: 'Запомнить пароль?',
    backSignIn: 'Вернуться к входу',
    backHome: '← Вернуться на главную',
  },
};

function resolveLocale() {
  try {
    const qsLang = new URLSearchParams(window.location.search).get('lang');
    const normalizedQs = String(qsLang || '').toLowerCase();
    if (normalizedQs === 'ru' || normalizedQs === 'en') {
      localStorage.setItem(LOCALE_STORAGE_KEY, normalizedQs);
      return normalizedQs;
    }
    const saved = String(localStorage.getItem(LOCALE_STORAGE_KEY) || '').toLowerCase();
    if (saved === 'ru' || saved === 'en') return saved;
    const browser = String(navigator.language || '').toLowerCase();
    return browser.startsWith('ru') ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [locale] = useState(resolveLocale);
  const copy = COPY[locale] || COPY.en;

  const handleRequestReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(copy.enterEmail);
      return;
    }

    setLoading(true);
    
    try {
      const data = await authAPI.requestPasswordReset(email);
      
      if (data.success) {
        setCodeSent(true);
        toast.success(copy.resetSent);
      } else {
        toast.error(data.message || copy.resetFailed);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || copy.resetFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-512.png" alt="ModelClone" className="w-12 h-12 rounded-xl object-cover" />
          <span className="text-2xl font-bold">ModelClone</span>
        </Link>

        {/* Reset Card */}
        <div className="glass rounded-3xl p-8">
          {!codeSent ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">{copy.title}</h1>
                <p className="text-gray-400">{copy.subtitle}</p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    {copy.labelEmail}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition"
                      placeholder="you@example.com"
                      disabled={loading}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white text-black hover:bg-white/90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-request-reset"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      <span>{copy.buttonSending}</span>
                    </div>
                  ) : (
                    <>
                      {copy.buttonSendCode}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold mb-2">{copy.checkEmailTitle}</h1>
                <p className="text-gray-400">
                  {copy.checkEmailSubtitlePrefix} <span className="text-white font-medium">{email}</span>
                </p>
              </div>

              <Link
                to="/reset-password"
                state={{ email }}
                className="block w-full py-3 rounded-xl bg-white text-black hover:bg-white/90 transition font-semibold text-center"
                data-testid="link-reset-password"
              >
                {copy.buttonEnterCode}
              </Link>

              <button
                onClick={() => setCodeSent(false)}
                className="w-full mt-4 py-3 rounded-xl glass hover:bg-white/10 transition font-semibold"
                data-testid="button-try-again"
              >
                {copy.buttonTryDifferent}
              </button>
            </>
          )}

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-black text-gray-400">{copy.rememberPassword}</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            to="/login"
            className="block w-full py-3 rounded-xl glass hover:bg-white/10 transition font-semibold text-center"
            data-testid="link-login"
          >
            {copy.backSignIn}
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-white transition">
            {copy.backHome}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
