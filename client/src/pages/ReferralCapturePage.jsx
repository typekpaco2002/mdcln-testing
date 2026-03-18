import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { referralAPI } from "../services/api";
import { generateFingerprint } from "../utils/fingerprint";

export default function ReferralCapturePage() {
  const navigate = useNavigate();
  const { suffix } = useParams();

  useEffect(() => {
    const normalized = suffix?.trim().toLowerCase();

    const run = async () => {
      if (suffix) {
        localStorage.setItem("pendingReferralCode", normalized);
      }

      if (normalized) {
        try {
          const fp = await generateFingerprint();
          await referralAPI.captureHint(
            normalized,
            fp?.visitorId || "no-fingerprint-available",
            navigator.userAgent || "Unknown",
          );
        } catch {
          // Best-effort capture; do not block redirect.
        }
      }

      // Affiliate/referral links land on create-ai-model page (https://modelclone.app/create-ai-model)
      const target = normalized
        ? `/create-ai-model?ref=${encodeURIComponent(normalized)}`
        : "/create-ai-model";
      navigate(target, { replace: true });
    };

    run();
  }, [navigate, suffix]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Applying referral and redirecting...</p>
      </div>
    </div>
  );
}
