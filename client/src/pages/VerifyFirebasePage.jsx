import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw, Zap, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store';

export default function VerifyFirebasePage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    if (!email) {
      toast.error('Email not found. Please sign up again.');
      navigate('/signup');
    }
  }, [email, navigate]);

  const handleInputChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every(digit => digit) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verificationCode) => {
    setLoading(true);
    
    try {
      const data = await authAPI.verifyFirebaseEmail(email, verificationCode);
      
      if (data.success) {
        setVerified(true);
        setAuth(data.user, data.token);
        toast.success('Email verified! Welcome to ModelClone');
        
        setTimeout(() => {
          if (!data.user.onboardingCompleted) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        }, 1500);
      } else {
        toast.error(data.message || 'Invalid verification code');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    
    try {
      const result = await authAPI.resendFirebaseCode(email);
      
      if (result.success) {
        toast.success('New verification code sent! Check your inbox');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        toast.error(result.message || 'Failed to resend code');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <img src="/logo-512.png" alt="ModelClone" className="w-12 h-12 rounded-xl object-cover" />
          <span className="text-2xl font-bold">ModelClone</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-6">
              {verified ? (
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              ) : (
                <Mail className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {verified ? 'Email Verified!' : 'Verify Your Email'}
            </h1>
            <p className="text-gray-400">
              {verified 
                ? 'Redirecting you to the app...'
                : `Enter the 6-digit code sent to ${email}`
              }
            </p>
          </div>

          {!verified && (
            <>
              <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white/5 border border-white/10 rounded-xl focus:border-white/40 transition-all"
                    disabled={loading}
                    data-testid={`input-code-${index}`}
                  />
                ))}
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handleVerify(code.join(''))}
                  disabled={loading || code.some(d => !d)}
                  className="w-full py-4 rounded-xl bg-white text-black font-semibold text-lg hover:bg-white/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-verify"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    'Verify Email'
                  )}
                </button>

                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-3 rounded-xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="button-resend-code"
                >
                  {resending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  Didn't receive the email? Check your spam folder
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-center mt-6 text-gray-400">
          Already verified?{' '}
          <Link to="/login" className="text-white hover:text-white/80 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
