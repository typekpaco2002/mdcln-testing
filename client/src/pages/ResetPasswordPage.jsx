import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Shield, ArrowRight, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
const LOCALE_STORAGE_KEY = 'app_locale';

const COPY = {
  en: {
    allFieldsRequired: 'Please fill in all fields',
    minLength: 'Password must be at least 6 characters',
    mismatch: 'Passwords do not match',
    success: 'Password reset successfully!',
    failed: 'Failed to reset password',
    title: 'Reset Password',
    subtitle: 'Enter the code from your email',
    labelEmail: 'Email',
    labelCode: '6-Digit Code',
    labelNewPassword: 'New Password',
    labelConfirmPassword: 'Confirm Password',
    buttonResetting: 'Resetting...',
    buttonReset: 'Reset Password',
    rememberPassword: 'Remember your password?',
    backSignIn: 'Back to Sign In',
    backHome: '← Back to Home',
  },
  ru: {
    allFieldsRequired: 'Пожалуйста, заполните все поля',
    minLength: 'Пароль должен состоять не менее чем из 6 символов',
    mismatch: 'Пароли не совпадают',
    success: 'Пароль успешно сброшен!',
    failed: 'Не удалось сбросить пароль',
    title: 'Сброс пароля',
    subtitle: 'Введите код из письма',
    labelEmail: 'Электронная почта',
    labelCode: '6-значный код',
    labelNewPassword: 'Новый пароль',
    labelConfirmPassword: 'Подтвердите пароль',
    buttonResetting: 'Сброс...',
    buttonReset: 'Сбросить пароль',
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

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [locale] = useState(resolveLocale);
  const copy = COPY[locale] || COPY.en;
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!email || !code || !newPassword || !confirmPassword) {
      toast.error(copy.allFieldsRequired);
      return;
    }

    if (newPassword.length < 6) {
      toast.error(copy.minLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(copy.mismatch);
      return;
    }

    setLoading(true);
    
    try {
      const data = await authAPI.resetPassword(email, code, newPassword);
      
      if (data.success) {
        toast.success(copy.success);
        navigate('/login');
      } else {
        toast.error(data.message || copy.failed);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || copy.failed);
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
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{copy.title}</h1>
            <p className="text-gray-400">{copy.subtitle}</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Email (if not pre-filled) */}
            {!location.state?.email && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  {copy.labelEmail}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition"
                  placeholder="you@example.com"
                  disabled={loading}
                  data-testid="input-email"
                />
              </div>
            )}

            {/* Verification Code */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                {copy.labelCode}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                disabled={loading}
                maxLength={6}
                data-testid="input-code"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                {copy.labelNewPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition"
                  placeholder="••••••••"
                  disabled={loading}
                  data-testid="input-password"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                {copy.labelConfirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition"
                  placeholder="••••••••"
                  disabled={loading}
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white text-black hover:bg-white/90 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-reset-password"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>{copy.buttonResetting}</span>
                </div>
              ) : (
                <>
                  {copy.buttonReset}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

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
