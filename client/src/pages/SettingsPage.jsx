import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, FileText, Cookie, CreditCard, AlertTriangle, X, TrendingUp, Lock, Eye, EyeOff, ShieldCheck, Smartphone, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useQuery, useMutation } from '@tanstack/react-query';
import api, { stripeAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { queryClient } from '../lib/queryClient';
import { hasBillingAccess, hasPremiumAccess } from '../utils/premiumAccess';

export default function SettingsPage() {
  const { user, refreshUserCredits, updateUser } = useAuthStore();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const canAccessPremium = hasPremiumAccess(user);
  const canAccessBilling = hasBillingAccess(user);
  
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Portal loading state
  const [openingPortal, setOpeningPortal] = useState(false);
  
  // 2FA state
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState(null);
  const [twoFactorQR, setTwoFactorQR] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [setting2FA, setSetting2FA] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailChangeToken, setEmailChangeToken] = useState('');
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [verifyingEmailChange, setVerifyingEmailChange] = useState(false);
  const [region, setRegion] = useState(user?.region || '');
  const [marketingLanguage, setMarketingLanguage] = useState(user?.marketingLanguage || '');
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    setDisplayName(user?.name || '');
  }, [user?.name]);
  useEffect(() => {
    setRegion(user?.region ?? '');
    setMarketingLanguage(user?.marketingLanguage ?? '');
  }, [user?.region, user?.marketingLanguage]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await authAPI.getProfile();
        if (!cancelled && data?.success && data.user) {
          updateUser(data.user);
        }
      } catch {
        // Best-effort refresh so billing/subscription controls don't disappear from stale client state.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [updateUser]);

  // Fetch subscription status
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/stripe/subscription-status'],
    queryFn: () => stripeAPI.getSubscriptionStatus(),
    enabled: canAccessBilling
  });

  // Fetch 2FA status
  const { data: twoFactorStatus, isLoading: twoFactorLoading } = useQuery({
    queryKey: ['/api/auth/2fa/status'],
    queryFn: authAPI.get2FAStatus,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: () => stripeAPI.cancelSubscription(),
    onSuccess: () => {
      toast.success('Subscription will be cancelled at the end of the billing period');
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
      refreshUserCredits();
      setShowCancelModal(false);
      setShowRetentionModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    }
  });

  const handleCancelClick = () => {
    setShowCancelModal(false);
    setShowRetentionModal(true);
  };

  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  const getTierName = (tier) => {
    if (!tier) return 'Free';
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const getTierPrice = (tier) => {
    const prices = {
      starter: '$29',
      pro: '$79',
      business: '$199'
    };
    return prices[tier] || '$0';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setChangingPassword(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  // 2FA handlers
  const handleSetup2FA = async () => {
    setSetting2FA(true);
    try {
      const data = await authAPI.generate2FASecret();
      if (data.success) {
        setTwoFactorSecret(data.secret);
        setTwoFactorQR(data.qrCode);
        setShow2FASetup(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate 2FA secret');
    } finally {
      setSetting2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    
    setSetting2FA(true);
    try {
      const data = await authAPI.verify2FA(verifyCode);
      if (data.success) {
        toast.success('Two-factor authentication enabled!');
        setShow2FASetup(false);
        setVerifyCode('');
        setTwoFactorSecret(null);
        setTwoFactorQR(null);
        queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid code. Please try again.');
      setVerifyCode('');
    } finally {
      setSetting2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    if (disableCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    
    setSetting2FA(true);
    try {
      const data = await authAPI.disable2FA(disableCode);
      if (data.success) {
        toast.success('Two-factor authentication disabled');
        setShowDisable2FA(false);
        setDisableCode('');
        queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid code');
      setDisableCode('');
    } finally {
      setSetting2FA(false);
    }
  };

  const handleUpdateName = async () => {
    const nextName = displayName.trim();
    if (!nextName) {
      toast.error('Name is required');
      return;
    }
    setSavingName(true);
    try {
      const data = await authAPI.updateProfile(nextName);
      if (data.success && data.user) {
        updateUser({ name: data.user.name });
        toast.success('Name updated');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || !emailPassword) {
      toast.error('Enter new email and current password');
      return;
    }
    setRequestingEmailChange(true);
    try {
      const data = await authAPI.requestEmailChange(newEmail.trim(), emailPassword);
      if (data.success) {
        setEmailChangeToken(data.emailChangeToken);
        toast.success('Verification code sent to new email');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request email change');
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailCode || emailCode.length !== 6 || !emailChangeToken) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setVerifyingEmailChange(true);
    try {
      const data = await authAPI.verifyEmailChange(emailCode, emailChangeToken);
      if (data.success && data.user) {
        updateUser({ email: data.user.email, isVerified: true });
        setNewEmail('');
        setEmailPassword('');
        setEmailCode('');
        setEmailChangeToken('');
        toast.success('Email updated successfully');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify email change');
    } finally {
      setVerifyingEmailChange(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6">
      <h1 className="text-2xl sm:text-4xl font-bold mb-4 sm:mb-8">Settings</h1>

      <div className="space-y-4 sm:space-y-6">
        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            Account Information
          </h2>
          
          <div className="space-y-2 sm:space-y-3">
            <div>
              <label className="text-xs sm:text-sm text-gray-400">Name</label>
              <div className="mt-1 flex flex-col sm:flex-row gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg glass-card focus:border-white/20 focus:outline-none text-white"
                  data-testid="input-settings-name"
                />
                <button
                  onClick={handleUpdateName}
                  disabled={savingName || displayName.trim() === (user?.name || '')}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  data-testid="button-update-name"
                >
                  {savingName ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm text-gray-400">Email</label>
              <p className="text-base sm:text-lg break-all">{user?.email}</p>
              {user?.authProvider === 'email' ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white"
                      placeholder="New email"
                      data-testid="input-settings-new-email"
                    />
                    <input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white"
                      placeholder="Current password"
                      data-testid="input-settings-email-password"
                    />
                  </div>
                  <button
                    onClick={handleRequestEmailChange}
                    disabled={requestingEmailChange}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    data-testid="button-request-email-change"
                  >
                    {requestingEmailChange ? 'Sending...' : 'Verify New Email'}
                  </button>
                  {emailChangeToken && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-2.5 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white tracking-widest"
                        placeholder="6-digit verification code"
                        data-testid="input-settings-email-code"
                      />
                      <button
                        onClick={handleVerifyEmailChange}
                        disabled={verifyingEmailChange || emailCode.length !== 6}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        data-testid="button-confirm-email-change"
                      >
                        {verifyingEmailChange ? 'Verifying...' : 'Confirm Email'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-400">
                  Email changes are only available for email/password accounts.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs sm:text-sm text-gray-400">Account Status</label>
              <p className="text-base sm:text-lg flex items-center gap-2">
                {user?.isVerified ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Verified
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Pending
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Communication preferences (region + marketing language) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Communication preferences
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mb-4">
            Region is set from your signup location; you can change it below. Choose your preferred language for marketing emails.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs sm:text-sm text-gray-400 block mb-1">Region (country)</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg glass-card focus:border-white/20 focus:outline-none text-white"
              >
                <option value="">Not set</option>
                <option value="US">United States</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
                <option value="SK">Slovakia</option>
                <option value="CZ">Czech Republic</option>
                <option value="PL">Poland</option>
                <option value="AT">Austria</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs sm:text-sm text-gray-400 block mb-1">Marketing email language</label>
              <select
                value={marketingLanguage}
                onChange={(e) => setMarketingLanguage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg glass-card focus:border-white/20 focus:outline-none text-white"
              >
                <option value="">Any / Default</option>
                <option value="en">English</option>
                <option value="sk">Slovenčina</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="pl">Polski</option>
                <option value="cs">Čeština</option>
              </select>
            </div>
          </div>
          <button
            onClick={async () => {
              setSavingPrefs(true);
              try {
                const data = await authAPI.updateProfile({ region: region || null, marketingLanguage: marketingLanguage || null });
                if (data?.success && data?.user) {
                  updateUser(data.user);
                  queryClient.invalidateQueries({ queryKey: ['/api/auth/profile'] });
                  toast.success('Communication preferences saved');
                }
              } catch (e) {
                toast.error(e?.response?.data?.message || 'Failed to save preferences');
              } finally {
                setSavingPrefs(false);
              }
            }}
            disabled={savingPrefs}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            {savingPrefs ? 'Saving...' : 'Save preferences'}
          </button>
        </motion.div>

        {/* Two-Factor Authentication */}
        <div className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
            Two-Factor Authentication
          </h2>
          
          {twoFactorLoading ? (
            <p className="text-gray-400 text-sm">Loading 2FA status...</p>
          ) : twoFactorStatus?.twoFactorEnabled ? (
            // 2FA is enabled
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="font-semibold text-green-400">2FA is Enabled</p>
                  <p className="text-sm text-gray-400">Your account is protected with two-factor authentication</p>
                </div>
              </div>
              
              {showDisable2FA ? (
                <div className="space-y-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-sm text-gray-300">Enter your 2FA code to disable two-factor authentication:</p>
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white text-center tracking-widest font-mono"
                    placeholder="000000"
                    maxLength={6}
                    data-testid="input-disable-2fa-code"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDisable2FA(false); setDisableCode(''); }}
                      className="flex-1 px-4 py-2 rounded-xl glass-card transition font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDisable2FA}
                      disabled={setting2FA || disableCode.length !== 6}
                      className="flex-1 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition font-semibold disabled:opacity-50"
                      data-testid="button-confirm-disable-2fa"
                    >
                      {setting2FA ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowDisable2FA(true)}
                  className="text-red-400 hover:text-red-300 transition text-sm"
                  data-testid="button-disable-2fa"
                >
                  Disable two-factor authentication
                </button>
              )}
            </div>
          ) : show2FASetup ? (
            // 2FA setup flow
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-white/70" />
                  Step 1: Scan QR Code
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
                </p>
                {twoFactorQR && (
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <img src={twoFactorQR} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
                {twoFactorSecret && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-400 mb-1">Or enter this code manually:</p>
                    <p className="font-mono text-sm glass-card px-3 py-2 rounded-lg select-all break-all">
                      {twoFactorSecret}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="p-4 rounded-xl glass-card">
                <h3 className="font-semibold mb-2">Step 2: Verify Code</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white text-center tracking-widest font-mono text-lg"
                  placeholder="000000"
                  maxLength={6}
                  data-testid="input-verify-2fa-code"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShow2FASetup(false); setVerifyCode(''); setTwoFactorSecret(null); setTwoFactorQR(null); }}
                  className="flex-1 px-4 py-3 rounded-xl glass-card transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={setting2FA || verifyCode.length !== 6}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-black bg-white hover:bg-white/90 transition-all disabled:opacity-50"
                  data-testid="button-verify-2fa"
                >
                  {setting2FA ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          ) : (
            // 2FA not enabled
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Add an extra layer of security to your account. When enabled, you'll need to enter a code from your authenticator app each time you log in.
              </p>
              <button
                onClick={handleSetup2FA}
                disabled={setting2FA}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                data-testid="button-setup-2fa"
              >
                {setting2FA ? 'Loading...' : 'Set Up Two-Factor Authentication'}
              </button>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div
          className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            Change Password
          </h2>
          
          {user?.authProvider !== 'email' ? (
            <p className="text-sm text-slate-400">
              Password change is only available for email/password accounts.
            </p>
          ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-xs sm:text-sm text-gray-400 block mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white pr-12"
                  placeholder="Enter current password"
                  data-testid="input-current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs sm:text-sm text-gray-400 block mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white pr-12"
                  placeholder="Enter new password (min 6 characters)"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-xs sm:text-sm text-gray-400 block mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl glass-card focus:border-white/20 focus:outline-none text-white"
                placeholder="Confirm new password"
                data-testid="input-confirm-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-black bg-white hover:bg-slate-100 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              data-testid="button-change-password"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </form>
          )}
        </div>

        {/* Subscription & Billing Management */}
        {canAccessBilling && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              {canAccessPremium ? 'Subscription' : 'Billing'}
            </h2>
            
            {subscriptionLoading && canAccessPremium ? (
              <p className="text-gray-400 text-sm sm:text-base">Loading subscription details...</p>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {canAccessPremium && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <label className="text-xs sm:text-sm text-gray-400">Current Plan</label>
                        <p className="text-xl sm:text-2xl font-bold text-white">
                          {getTierName(user.subscriptionTier)}
                        </p>
                      </div>
                      <div className="text-right">
                        <label className="text-xs sm:text-sm text-gray-400">Price</label>
                        <p className="text-xl sm:text-2xl font-bold">
                          {getTierPrice(user.subscriptionTier)}<span className="text-xs sm:text-sm text-gray-400">/mo</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs sm:text-sm text-gray-400">Status</label>
                      {subscription?.cancelAtPeriodEnd ? (
                        <p className="text-base sm:text-lg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-orange-400">
                            Cancels on {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}
                          </span>
                        </p>
                      ) : (
                        <p className="text-base sm:text-lg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          {user.subscriptionStatus === 'active' ? 'Active' : user.subscriptionStatus}
                        </p>
                      )}
                    </div>

                    {subscription?.currentPeriodEnd && !subscription?.cancelAtPeriodEnd && (
                      <div>
                        <label className="text-xs sm:text-sm text-gray-400">Next Billing Date</label>
                        <p className="text-base sm:text-lg">{new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}</p>
                      </div>
                    )}
                  </>
                )}

                {!canAccessPremium && (
                  <p className="text-gray-400 text-sm sm:text-base">
                    View your payment history and manage payment methods through the billing portal.
                  </p>
                )}

                <div className={`${canAccessPremium ? 'pt-4 border-t border-white/10' : ''} flex flex-col sm:flex-row gap-3`}>
                  <button
                    onClick={async () => {
                      if (openingPortal) return;
                      setOpeningPortal(true);
                      try {
                        const { url } = await stripeAPI.createPortalSession();
                        window.open(url, '_blank');
                      } catch (error) {
                        toast.error('Failed to open billing portal');
                      } finally {
                        setOpeningPortal(false);
                      }
                    }}
                    disabled={openingPortal}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-black bg-white hover:bg-white/90 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                    data-testid="button-manage-billing"
                  >
                    <CreditCard className="w-4 h-4" />
                    {openingPortal ? 'Opening...' : (canAccessPremium ? 'Manage Subscription' : 'View Billing')}
                    {!openingPortal && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                  </button>
                  {user?.stripeSubscriptionId && !subscription?.cancelAtPeriodEnd && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="text-red-400 hover:text-red-300 transition flex items-center gap-2 px-4 py-2.5"
                      data-testid="button-cancel-subscription"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Legal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-xl sm:rounded-2xl p-4 sm:p-6"
        >
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            Legal & Privacy
          </h2>
          
          <div className="space-y-3">
            <Link
              to="/terms"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
            >
              <FileText className="w-5 h-5 text-gray-400" />
              <span>Terms of Service</span>
            </Link>
            <Link
              to="/privacy"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
            >
              <Shield className="w-5 h-5 text-gray-400" />
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/cookies"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
            >
              <Cookie className="w-5 h-5 text-gray-400" />
              <span>Cookie Policy</span>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-strong rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold">Cancel Subscription?</h3>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  data-testid="button-close-cancel-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-300 mb-6">
                Your subscription will remain active until the end of your current billing period, 
                then you'll lose access to premium features.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition"
                  data-testid="button-keep-subscription"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelClick}
                  className="flex-1 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold transition"
                  data-testid="button-proceed-cancel"
                >
                  Proceed to Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retention Modal */}
      <AnimatePresence>
        {showRetentionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRetentionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel-strong rounded-2xl p-8 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg glass-card">
                    <TrendingUp className="w-8 h-8 text-white/70" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Before You Go...</h3>
                    <p className="text-gray-400">We have a special offer for you</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRetentionModal(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition"
                  data-testid="button-close-retention-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl glass-card">
                  <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="text-2xl">💎</span>
                    Think about what you'll lose
                  </h4>
                  <p className="text-gray-300 text-sm">
                    You're currently getting amazing value with your {getTierName(user.subscriptionTier)} plan. 
                    Consider what you'll miss out on if you cancel.
                  </p>
                </div>

                <div className="p-4 rounded-xl glass-card">
                  <h4 className="font-bold mb-2">Benefits you'll lose:</h4>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• {user.subscriptionTier === 'starter' ? '2,900' : user.subscriptionTier === 'pro' ? '8,900' : '24,900'} credits every month</li>
                    <li>• Access to all premium AI models</li>
                    <li>• Priority customer support</li>
                    <li>• Commercial usage license</li>
                    <li>• {user.subscriptionTier === 'pro' && '11% cheaper per credit'}</li>
                    <li>• {user.subscriptionTier === 'business' && '20% cheaper per credit + API access'}</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmCancel}
                  disabled={cancelMutation.isPending}
                  className="flex-1 px-6 py-3 glass-card rounded-xl font-semibold transition disabled:opacity-50"
                  data-testid="button-confirm-cancel"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Anyway'}
                </button>
                <button
                  onClick={() => {
                    setShowRetentionModal(false);
                    toast.success('Great choice! We\'re glad to have you stay');
                  }}
                  className="flex-1 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-xl font-semibold transition"
                  data-testid="button-stay-subscribed"
                >
                  Keep My Subscription
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
