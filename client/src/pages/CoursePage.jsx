import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  MonitorPlay,
  ArrowLeft,
  Video,
  Lock,
  ShoppingCart,
  Zap,
  TrendingUp,
  Users,
  Award,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import api from "../services/api";

const CATEGORIES = [
  {
    id: "content-generation",
    title: "Content Generation",
    description: "Learn how to create AI models and generate content",
    icon: MonitorPlay,
    videos: [
      {
        id: "create-model-and-sfw",
        title: "How to Create Your AI Model & Generate SFW Content",
        description: "Complete guide to creating your AI model from scratch and generating safe-for-work images and videos.",
        duration: null,
        videoUrl: "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/sfw_model_tutorial.mp4",
      },
      {
        id: "generate-nsfw",
        title: "How to Generate NSFW Content",
        description: "Complete guide to generating NSFW content including LoRA training, image generation, and video creation.",
        duration: null,
        videoUrl: "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/nsfw_tutorial.mp4",
      },
    ],
  },
  {
    id: "marketing-mastery",
    title: "Marketing Mastery",
    description: "Learn how to promote your AI model and maximize revenue",
    icon: Megaphone,
    videos: [
      {
        id: "marketing-ig-tiktok",
        title: "Instagram/TikTok Marketing Strategy",
        description: "Proven strategies for marketing your AI model on Instagram and TikTok to grow your audience and revenue.",
        duration: null,
        videoUrl: "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/ig_tiktok_marketing_strategy.mp4",
      },
      {
        id: "marketing-platforms",
        title: "Platform Strategies for Maximum Reach",
        description: "Which platforms to use, how to set up profiles, and how to grow your audience fast.",
        duration: null,
        videoUrl: null,
      },
      {
        id: "marketing-pricing",
        title: "Pricing & Monetization Strategies",
        description: "How to price your content, create bundles, and build recurring revenue streams.",
        duration: null,
        videoUrl: null,
      },
      {
        id: "marketing-scaling",
        title: "Scaling to $10K/Month and Beyond",
        description: "Advanced techniques for scaling your AI model business to serious revenue.",
        duration: null,
        videoUrl: null,
      },
    ],
  },
  {
    id: "chatting-guide",
    title: "Chatting Guide",
    description: "Master the art of chatting to convert followers into paying fans",
    icon: MessageCircle,
    videos: [
      {
        id: "chatting-basics",
        title: "Chatting Fundamentals",
        description: "How to start conversations, build rapport, and keep fans engaged.",
        duration: null,
        videoUrl: "https://pub-deb24e74d34c49a3a2e474e11dbf5a64.r2.dev/static/chatting_course.mp4",
      },
      {
        id: "chatting-selling",
        title: "Selling Through Chat",
        description: "Proven techniques to convert casual chats into sales without being pushy.",
        duration: null,
        videoUrl: null,
      },
      {
        id: "chatting-retention",
        title: "Fan Retention & Upselling",
        description: "Keep fans coming back and spending more with smart chatting strategies.",
        duration: null,
        videoUrl: null,
      },
    ],
  },
];

const COURSE_FEATURES = [
  {
    icon: Users,
    iconClassName: "w-4.5 h-4.5 text-slate-400",
    iconWrapperStyle: {
      background: "rgba(255,255,255,0.25)",
      border: "1px solid rgba(255,255,255,0.28)",
    },
    title: "Create Your AI Model or Clone",
    description: (
      <>
        Learn how to{" "}
        <span className="font-semibold">build an AI model from scratch</span>{" "}
        or <span className="font-semibold">clone a real person's appearance</span>
      </>
    ),
  },
  {
    icon: Zap,
    iconClassName: "w-4.5 h-4.5 text-amber-300",
    iconWrapperStyle: {
      background: "rgba(250,204,21,0.25)",
      border: "1px solid rgba(250,204,21,0.28)",
    },
    title: "Generate SFW & NSFW Content",
    description: (
      <>
        Master both <span className="font-semibold">safe-for-work</span> and{" "}
        <span className="font-semibold">NSFW content generation</span> with{" "}
        <span className="font-semibold">professional results</span>
      </>
    ),
  },
  {
    icon: TrendingUp,
    iconClassName: "w-4.5 h-4.5 text-emerald-400",
    iconWrapperStyle: {
      background: "rgba(16,185,129,0.25)",
      border: "1px solid rgba(255,255,255,0.28)",
    },
    title: "Market Your Model & Make Money",
    description: (
      <>
        <span className="font-semibold">Proven strategies</span> to promote your AI model
        and <span className="font-semibold">monetize your content</span>
      </>
    ),
  },
  {
    icon: Award,
    iconClassName: "w-4.5 h-4.5 text-amber-300",
    iconWrapperStyle: {
      background: "rgba(255,255,255,0.25)",
      border: "1px solid rgba(255,255,255,0.28)",
    },
    title: "Made by a $2M+ Agency",
    description: (
      <>
        Course created by an agency that{" "}
        <span className="font-semibold">surpassed 2 million in sales</span>
      </>
    ),
  },
];

function LockedCoursePage({ onNavigateToCredits }) {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            ModelClone Masterclass
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            Everything you need to <span className="font-semibold">build</span>,{" "}
            <span className="font-semibold">generate</span>, and{" "}
            <span className="font-semibold">profit from AI models</span> —
            taught by an agency that <span className="font-semibold">surpassed $2M+ in sales</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {COURSE_FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-xl bg-white/5 border border-white/5"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={feature.iconWrapperStyle}
                >
                  <feature.icon className={feature.iconClassName} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-0.5">{feature.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.28)",
            backdropFilter: "blur(15px)",
            WebkitBackdropFilter: "blur(15px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Active Subscription Required
          </h3>
          <p className="text-slate-400 text-sm mb-5 max-w-sm mx-auto">
            An <span className="font-semibold">active subscription</span> is required to access
            the <span className="font-semibold">complete masterclass</span>. Subscribe to start
            building your <span className="font-semibold">AI empire</span>.
          </p>
          <button
            onClick={onNavigateToCredits}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold border border-white/70 hover:bg-slate-100 hover:scale-[1.02] hover:shadow-lg transition-all"
            data-testid="button-unlock-course"
          >
            <ShoppingCart className="w-4 h-4" />
            Subscribe to Unlock
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function VideoPlayer({ video, onBack }) {
  if (!video.videoUrl) {
    return (
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          data-testid="button-back-to-category"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to videos
        </button>

        <div className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
          <div className="aspect-video bg-black/50 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Video className="w-8 h-8 text-purple-400" />
            </div>
            <div className="text-center px-4">
              <p className="text-white font-semibold text-lg mb-1">Coming Soon</p>
              <p className="text-slate-400 text-sm max-w-md">
                This video is being recorded and will be available shortly.
              </p>
            </div>
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-white mb-2">{video.title}</h2>
            <p className="text-slate-400 text-sm">{video.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
        data-testid="button-back-to-category"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to videos
      </button>

      <div className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
        <div className="aspect-video bg-black">
          <video
            src={video.videoUrl}
            controls
            className="w-full h-full"
            controlsList="nodownload"
            data-testid={`video-player-${video.id}`}
          />
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold text-white mb-2">{video.title}</h2>
          <p className="text-slate-400 text-sm">{video.description}</p>
          {video.duration && (
            <span className="text-xs text-slate-500 mt-2 inline-block">{video.duration}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryView({ category, onSelectVideo }) {
  return (
    <div>
      <div className="mb-6">
        <div className="mb-2">
          <h2 className="text-xl font-bold text-white">{category.title}</h2>
          <p className="text-slate-400 text-sm">{category.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {category.videos.map((video, index) => (
          <motion.button
            key={video.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectVideo(video)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors text-left group"
            data-testid={`button-video-${video.id}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-medium text-white truncate">
                {video.title}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {video.description}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {video.duration && (
                <span className="text-xs text-slate-500">{video.duration}</span>
              )}
              {!video.videoUrl && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                  SOON
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function CoursePage({ setActiveTab, onOpenCredits, initialVideoId, onVideoIdConsumed }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [courseUnlocked, setCourseUnlocked] = useState(false);

  useEffect(() => {
    loadCourseStatus();
  }, []);

  useEffect(() => {
    if (initialVideoId && courseUnlocked && !isLoading) {
      for (const cat of CATEGORIES) {
        const video = cat.videos.find((v) => v.id === initialVideoId);
        if (video) {
          setSelectedCategory(cat);
          setSelectedVideo(video);
          break;
        }
      }
      if (onVideoIdConsumed) onVideoIdConsumed();
    }
  }, [initialVideoId, courseUnlocked, isLoading]);

  const loadCourseStatus = async () => {
    try {
      const response = await api.get("/course/status");
      if (response.data.success) {
        setCourseUnlocked(response.data.courseUnlocked);
      }
    } catch (error) {
      console.error("Failed to load course status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToCredits = () => {
    if (onOpenCredits) {
      onOpenCredits();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!courseUnlocked) {
    return <LockedCoursePage onNavigateToCredits={handleNavigateToCredits} />;
  }

  if (selectedVideo) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <VideoPlayer
          video={selectedVideo}
          onBack={() => setSelectedVideo(null)}
        />
      </div>
    );
  }

  if (selectedCategory) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
          data-testid="button-back-to-categories"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to categories
        </button>
        <CategoryView
          category={selectedCategory}
          onSelectVideo={setSelectedVideo}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Courses</h1>
          <p className="text-slate-400 mt-1">
            Video tutorials to help you get the most out of ModelClone
          </p>
        </div>

        <div className="space-y-3">
          {CATEGORIES.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedCategory(category)}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors text-left group"
              data-testid={`button-category-${category.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-lg font-semibold text-white">
                  {category.title}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {category.videos.length} videos
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
