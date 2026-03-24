import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store';
const LOCALE_STORAGE_KEY = 'app_locale';

const COPY = {
  en: {
    missingEmail: 'Email not found. Please sign up again.',
    codeIncomplete: 'Please enter the full 6-digit code',
    success: 'Email verified! Welcome to ModelClone',
    failed: 'Verification failed',
    resendSuccess: 'Verification code sent! Check your email',
    resendFailed: 'Failed to resend code',
    title: 'Verify Your Email',
    subtitleLine1: 'We sent a 6-digit code to',
    buttonVerifying: 'Verifying...',
    buttonVerify: 'Verify Email',
    resendSending: 'Sending...',
    resendDefault: "Didn't receive code? Resend",
    tipPrefix: '💡 Tip:',
    tipText: "Check your spam folder if you don't see the email. The code expires in 10 minutes.",
    backToLogin: '← Back to Login',
  },
  ru: {
    missingEmail: 'Адрес электронной почты не найден. Пожалуйста, зарегистрируйтесь заново.',
    codeIncomplete: 'Введите полный 6-значный код',
    success: 'Адрес электронной почты подтвержден! Добро пожаловать в ModelClone',
    failed: 'Подтверждение не удалось',
    resendSuccess: 'Код подтверждения отправлен! Проверьте свою электронную почту',
    resendFailed: 'Не удалось повторно отправить код',
    title: 'Подтвердите свой адрес электронной почты',
    subtitleLine1: 'Мы отправили 6-значный код на',
    buttonVerifying: 'Проверка...',
    buttonVerify: 'Подтвердить адрес электронной почты',
    resendSending: 'Отправляется...',
    resendDefault: 'Не получили код? Отправить заново',
    tipPrefix: '💡 Совет:',
    tipText: 'Проверьте папку «Спам», если не видите письмо. Срок действия кода истекает через 10 минут.',
    backToLogin: '← Вернуться к входу',
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

export default function VerifyEmailPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [locale] = useState(resolveLocale);
  const copy = COPY[locale] || COPY.en;
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!email) {
      toast.error(copy.missingEmail);
      navigate('/signup');
    }
  }, [email, navigate, copy.missingEmail]);

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace - focus previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = pastedData.split('');
    setCode([...newCode, ...Array(6 - newCode.length).fill('')]);
    
    // Focus last filled input
    const lastIndex = Math.min(newCode.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      toast.error(copy.codeIncomplete);
      return;
    }

    setLoading(true);
    
    try {
      const data = await authAPI.verifyEmail(email, verificationCode);
      
      if (data.success) {
        setAuth(data.user, data.token);
        toast.success(copy.success);
        navigate('/dashboard');
      } else {
        toast.error(data.message || copy.failed);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || copy.failed);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    
    try {
      const data = await authAPI.resendCode(email);
      
      if (data.success) {
        toast.success(copy.resendSuccess);
      } else {
        toast.error(data.message || copy.resendFailed);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || copy.resendFailed);
    } finally {
      setResending(false);
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

        {/* Verification Card */}
        <div className="glass rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">{copy.title}</h1>
            <p className="text-gray-400">
              {copy.subtitleLine1}<br />
              <span className="text-white font-semibold">{email}</span>
            </p>
          </div>

          {/* Code Input */}
          <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={loading || code.join('').length !== 6}
            className="w-full py-3 rounded-xl bg-white text-black hover:bg-white/90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>{copy.buttonVerifying}</span>
              </div>
            ) : (
              <>
                {copy.buttonVerify}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-gray-400 hover:text-white transition text-sm disabled:opacity-50"
            >
              {resending ? copy.resendSending : copy.resendDefault}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-sm text-gray-300">
              {copy.tipPrefix} {copy.tipText}
            </p>
          </div>
        </div>

        {/* Back to Login */}
        <div className="text-center mt-6">
          <Link to="/login" className="text-gray-400 hover:text-white transition">
            {copy.backToLogin}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
