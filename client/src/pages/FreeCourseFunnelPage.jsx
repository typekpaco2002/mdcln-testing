import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play, CheckCircle, Sparkles, TrendingUp, DollarSign, Clock } from "lucide-react";
import { useAuthStore } from "../store";
import api from "../services/api";

export default function FreeCourseFunnelPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [currentVideo, setCurrentVideo] = useState(1);
  const [videoWatched, setVideoWatched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.freeVideosCompleted >= 2) {
        navigate("/onboarding");
      } else if (user?.freeVideosCompleted === 1) {
        setCurrentVideo(2);
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleWatchComplete = () => {
    setVideoWatched(true);
  };

  const handleNextVideo = async () => {
    if (!isAuthenticated) {
      localStorage.setItem("redirectAfterLogin", "/free-course");
      navigate("/login");
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/course/complete-video", { videoNumber: currentVideo });
      
      if (currentVideo === 1) {
        updateUser({ ...user, freeVideosCompleted: 1 });
        setCurrentVideo(2);
        setVideoWatched(false);
      } else {
        updateUser({ ...user, freeVideosCompleted: 2 });
        navigate("/onboarding");
      }
    } catch (error) {
      console.error("Error completing video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const videoContent = {
    1: {
      title: "How People Are Making $10K+/Month With AI Models",
      subtitle: "Watch this free training to learn the exact method",
      duration: "8 min",
      keyPoints: [
        "Why AI models are the biggest opportunity in 2026",
        "How creators are replacing expensive photoshoots",
        "The simple 3-step process to start earning",
      ],
    },
    2: {
      title: "Step-By-Step: Building Your First AI Model",
      subtitle: "See exactly how it works in under 10 minutes",
      duration: "10 min",
      keyPoints: [
        "How to create your AI model in minutes",
        "Generating content that sells",
        "Scaling to $10K+/month with automation",
      ],
    },
  };

  const video = videoContent[currentVideo];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0f0f1a] to-[#0a0a12] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">
              Free Training - Video {currentVideo} of 2
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold mb-4 leading-tight">
            {video.title}
          </h1>
          <p className="text-slate-400 text-lg">{video.subtitle}</p>
        </motion.div>

        <motion.div
          key={currentVideo}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative mb-8"
        >
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Play className="w-8 h-8 text-purple-400 ml-1" />
              </div>
              <p className="text-slate-400 text-sm">Video placeholder - Coming soon</p>
              <p className="text-slate-500 text-xs">Duration: {video.duration}</p>

              <button
                onClick={handleWatchComplete}
                className="mt-4 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                data-testid="button-simulate-watch"
              >
                {videoWatched ? "Video Completed" : "Mark as Watched (for testing)"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {video.keyPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-300">{point}</span>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {videoWatched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center"
            >
              <button
                onClick={handleNextVideo}
                disabled={isLoading}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-lg font-bold inline-flex items-center gap-3 group transition-all disabled:opacity-50"
                data-testid="button-next-video"
              >
                {isLoading ? (
                  "Loading..."
                ) : currentVideo === 1 ? (
                  <>
                    Next Video
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    Start Making Money
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {currentVideo === 2 && (
                <p className="text-slate-500 text-sm mt-4">
                  You'll be taken to create your first AI model
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">$10K+</div>
            <div className="text-sm text-slate-400">Average monthly income</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
            <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">10x</div>
            <div className="text-sm text-slate-400">Content output increase</div>
          </div>
          <div className="text-center p-6 rounded-2xl bg-white/5 border border-white/5">
            <Clock className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">5 min</div>
            <div className="text-sm text-slate-400">Setup time</div>
          </div>
        </div>
      </div>
    </div>
  );
}
