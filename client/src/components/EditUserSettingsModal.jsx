import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function EditUserSettingsModal({ isOpen, onClose, user, onSuccess }) {
  const [maxModels, setMaxModels] = useState('');
  const [allowCustomLoraTrainingPhotos, setAllowCustomLoraTrainingPhotos] = useState(false);
  const [premiumFeaturesUnlocked, setPremiumFeaturesUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setMaxModels(user.maxModels?.toString?.() || '0');
    setAllowCustomLoraTrainingPhotos(!!user.allowCustomLoraTrainingPhotos);
    setPremiumFeaturesUnlocked(!!user.premiumFeaturesUnlocked);
  }, [user]);

  const handleSave = async () => {
    if (!maxModels || parseInt(maxModels) < 0) {
      toast.error('Enter valid max models amount (0 or greater)');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/admin/users/settings', {
        userId: user.id,
        maxModels: parseInt(maxModels),
        allowCustomLoraTrainingPhotos,
        premiumFeaturesUnlocked,
      });

      if (response.data.success) {
        toast.success(`Updated max models to ${maxModels} for ${user.email}`);
        onSuccess();
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="glass-panel-strong rounded-3xl p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Edit User Settings</h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
                  data-testid="button-close-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="p-4 rounded-xl glass-card border border-white/20">
                  <p className="text-sm text-slate-300">
                    <strong>User:</strong> {user.email}
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    <strong>Current Models:</strong> {user._count?.savedModels || 0}
                  </p>
                  <p className="text-sm text-slate-300 mt-1">
                    <strong>Current Max:</strong> {user.maxModels}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Models Allowed
                  </label>
                  <input
                    type="number"
                    value={maxModels}
                    onChange={(e) => setMaxModels(e.target.value)}
                    placeholder={user.maxModels.toString()}
                    min="0"
                    className="w-full px-4 py-3 glass-card rounded-xl focus:border-white/20 transition"
                    data-testid="input-max-models"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Set to 0 to prevent user from creating any models
                  </p>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl glass-card border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCustomLoraTrainingPhotos}
                    onChange={(e) => setAllowCustomLoraTrainingPhotos(e.target.checked)}
                    className="mt-0.5"
                    data-testid="input-allow-custom-lora-training-photos"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Allow Custom LoRA Training Photos</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Enables this user to upload their own training photos for LoRA training.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl glass-card border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={premiumFeaturesUnlocked}
                    onChange={(e) => setPremiumFeaturesUnlocked(e.target.checked)}
                    className="mt-0.5"
                    data-testid="input-premium-features-unlocked"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">Unlock Premium Features</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Grants access to Courses, Reel Finder, and Photo/Video Repurposer without an active subscription.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl glass-card transition"
                  data-testid="button-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !maxModels}
                  className="flex-1 py-3 rounded-xl btn-primary-glass transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-save-settings"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Settings className="w-5 h-5" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
