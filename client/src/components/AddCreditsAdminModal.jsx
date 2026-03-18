import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function AddCreditsAdminModal({ isOpen, onClose, user, onSuccess }) {
  const [credits, setCredits] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!credits || parseInt(credits) <= 0) {
      toast.error('Enter valid credit amount');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/admin/credits/add', {
        userId: user.id,
        credits: parseInt(credits),
        reason: reason || 'Admin gift'
      });

      if (response.data.success) {
        toast.success(`Added ${credits} credits to ${user.email}`);
        onSuccess();
        onClose();
        setCredits('');
        setReason('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add credits');
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
                <h2 className="text-2xl font-bold">Add Credits</h2>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
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
                    <strong>Current Credits:</strong> {user.credits}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Credits Amount</label>
                  <input
                    type="number"
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    placeholder="100"
                    min="1"
                    className="w-full px-4 py-3 glass-card rounded-xl focus:border-white/20 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason (optional)</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Promo gift, support, etc."
                    className="w-full px-4 py-3 glass-card rounded-xl focus:border-white/20 transition"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl glass-card transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={loading || !credits}
                  className="flex-1 py-3 rounded-xl btn-primary-glass transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Add Credits
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
