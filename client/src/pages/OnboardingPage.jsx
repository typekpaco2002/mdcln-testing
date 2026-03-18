import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Crown,
  Gift,
  User,
  Wand2,
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  Palette,
  Eye,
  Heart,
  Clock,
  Star,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../store";
import api from "../services/api";
import toast from "react-hot-toast";
import CheckoutModal from "../components/CheckoutModal";
import { pollModelUntilReady } from "../utils/modelStatusPolling";

const STEP = {
  CHOOSE: 0,
  AI_NAME: 1,        // Name your model
  AI_CONFIG: 2,      // Customize appearance
  AI_GENERATING: 3,
  AI_OFFER: 4,       // Show $6 special offer
  AI_PROCESSING: 5,  // Processing payment
  REAL_UPLOAD: 10,
  REAL_UPLOADING: 11,
  REAL_PREVIEW: 12,  // Show auto-generated preview
  REAL_PROMPT: 13,   // Custom prompt input
  REAL_GENERATING: 14, // Fake generation loading
  REAL_BLURRED: 15,  // Blurred preview with upsell
};

const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const AGE_OPTIONS = [
  { value: "18-22", label: "18-22" },
  { value: "23-27", label: "23-27" },
  { value: "28-35", label: "28-35" },
  { value: "36-45", label: "36-45" },
  { value: "46-55", label: "46-55" },
  { value: "56+", label: "56+" },
];

const HAIR_COLOR_OPTIONS = [
  { value: "blonde", label: "Blonde" },
  { value: "brown", label: "Brown" },
  { value: "black", label: "Black" },
  { value: "red", label: "Red" },
  { value: "auburn", label: "Auburn" },
  { value: "platinum", label: "Platinum" },
  { value: "white", label: "White" },
  { value: "pink", label: "Pink" },
];

const HAIR_LENGTH_OPTIONS = [
  { value: "long", label: "Long" },
  { value: "medium", label: "Medium" },
  { value: "short", label: "Short" },
];

const HAIR_TEXTURE_OPTIONS = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
];

const LIP_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "big", label: "Big" },
];

const FACE_TYPE_OPTIONS = [
  { value: "cute", label: "Cute Feminine" },
  { value: "model", label: "Model Face" },
  { value: "natural", label: "Natural" },
];

const EYE_COLOR_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "brown", label: "Brown" },
  { value: "green", label: "Green" },
  { value: "hazel", label: "Hazel" },
  { value: "gray", label: "Gray" },
];

const BODY_TYPE_OPTIONS = [
  { value: "slim", label: "Slim" },
  { value: "athletic", label: "Athletic" },
  { value: "curvy", label: "Curvy" },
  { value: "petite", label: "Petite" },
  { value: "hourglass", label: "Hourglass" },
  { value: "muscular", label: "Muscular" },
];

const HERITAGE_OPTIONS = [
  { value: "european", label: "European" },
  { value: "african", label: "African" },
  { value: "latino", label: "Latino" },
  { value: "asian", label: "Asian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "mixed", label: "Mixed" },
];

const STYLE_OPTIONS = [
  { value: "natural", label: "Natural Look" },
  { value: "strong-makeup", label: "Strong Makeup" },
];


function PhotoUploadSlot({ label, file, onFileSelect, onRemove, required }) {
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleDragOver = (e) => e.preventDefault();

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden ${
        file ? "border-white/40 bg-white/10" : "border-white/20 hover:border-white/40"
      }`}
      style={{ aspectRatio: "3/4" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {file ? (
        <>
          <img
            src={URL.createObjectURL(file)}
            alt={label}
            className="w-full h-full object-cover"
          />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs text-center text-white/80">{label}</p>
          </div>
        </>
      ) : (
        <label className="flex flex-col items-center justify-center h-full cursor-pointer p-3">
          <Camera className="w-6 h-6 text-slate-400 mb-2" />
          <p className="text-xs text-slate-400 text-center">{label}</p>
          {required && <p className="text-[10px] text-red-400 mt-1">Required</p>}
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
            onChange={(e) => e.target.files[0] && onFileSelect(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, refreshUserCredits } = useAuthStore();
  const [step, setStep] = useState(STEP.CHOOSE);
  const [isLoading, setIsLoading] = useState(false);
  const [path, setPath] = useState(null);

  const [generatedPortrait, setGeneratedPortrait] = useState(null);
  const [createdModelId, setCreatedModelId] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [previewImage, setPreviewImage] = useState(null); // Auto-generated preview for real path
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [modelName, setModelName] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
  // Countdown timer for special offer (15 minutes)
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  
  useEffect(() => {
    if (step === STEP.AI_OFFER && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const [aiConfig, setAiConfig] = useState({
    gender: null,
    age: "",
    hairColor: null,
    hairLength: null,
    hairTexture: null,
    lipSize: null,
    faceType: null,
    eyeColor: null,
    bodyType: null,
    heritage: null,
    style: null,
  });
  
  // Check if all AI config fields are selected
  const aiAgeValid = Number.isFinite(parseInt(aiConfig.age, 10)) && parseInt(aiConfig.age, 10) >= 1;
  const isAiConfigComplete =
    aiConfig.gender &&
    aiAgeValid &&
    aiConfig.hairColor &&
    aiConfig.hairLength &&
    aiConfig.hairTexture &&
    aiConfig.lipSize &&
    aiConfig.faceType &&
    aiConfig.eyeColor &&
    aiConfig.bodyType &&
    aiConfig.heritage &&
    aiConfig.style;

  const [realPhotos, setRealPhotos] = useState({
    face1: null,
    face2: null,
    body: null,
  });

  // Looks for real-photo model (optional — user can skip)
  const [realLooks, setRealLooks] = useState({});
  const [realAge, setRealAge] = useState("");
  const [autoDetecting, setAutoDetecting] = useState(false);

  const handleAutoDetectLooks = async () => {
    if (!realPhotos.face1 && !realPhotos.face2 && !realPhotos.body) {
      toast.error("Upload at least one photo first");
      return;
    }
    setAutoDetecting(true);
    try {
      // Upload available photos to get temporary URLs for Grok vision
      const uploadPhoto = async (file) => {
        if (!file) return null;
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.post("/drafts/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        return res.data.url || null;
      };
      const [url1, url2, url3] = await Promise.all([
        uploadPhoto(realPhotos.face1),
        uploadPhoto(realPhotos.face2),
        uploadPhoto(realPhotos.body),
      ]);
      const imageUrls = [url1, url2, url3].filter(Boolean);
      const response = await api.post("/generate/analyze-looks", {
        imageUrls,
        freeForOnboarding: true,
      });
      if (response.data.success && response.data.looks) {
        const { age, ...chipLooks } = response.data.looks;
        setRealLooks(chipLooks);
        if (age) setRealAge(String(age));
        toast.success("Looks detected!");
      } else {
        toast.error(response.data.message || "Detection failed");
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to detect looks";
      toast.error(msg);
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleChoosePath = (selectedPath) => {
    setPath(selectedPath);
    if (selectedPath === "ai") {
      setStep(STEP.AI_NAME);
    } else {
      setStep(STEP.REAL_UPLOAD);
    }
  };

  const handleGenerateAIPortrait = async () => {
    setStep(STEP.AI_GENERATING);
    setIsLoading(true);

    try {
      const response = await api.post("/onboarding/trial-generate", {
        gender: aiConfig.gender,
        age: aiConfig.age ? parseInt(aiConfig.age, 10) : undefined,
        style: aiConfig.style,
        hairColor: aiConfig.hairColor,
        hairLength: aiConfig.hairLength,
        hairTexture: aiConfig.hairTexture,
        lipSize: aiConfig.lipSize,
        faceType: aiConfig.faceType,
        eyeColor: aiConfig.eyeColor,
        bodyType: aiConfig.bodyType,
        heritage: aiConfig.heritage,
      });

      if (response.data.success) {
        setGeneratedPortrait(response.data.referenceUrl);
        await refreshUserCredits();
        setStep(STEP.AI_OFFER); // Show special offer instead of prompt
        toast.success("Portrait generated!");
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Trial generation failed:", error);
      const message = error.response?.data?.message || "Generation failed. Please try again.";
      
      if (error.response?.data?.code === "TRIAL_ALREADY_USED") {
        toast.error("You've already used your free trial");
        navigate("/dashboard");
      } else {
        toast.error(message);
        setStep(STEP.AI_CONFIG);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadRealPhotos = async () => {
    if (!realPhotos.face1 || !realPhotos.face2 || !realPhotos.body) {
      toast.error("Please upload all 3 photos");
      return;
    }

    setStep(STEP.REAL_UPLOADING);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("face1", realPhotos.face1);
      formData.append("face2", realPhotos.face2);
      formData.append("body", realPhotos.body);
      formData.append("name", "My Model");
      if (Object.keys(realLooks).length > 0) {
        formData.append("savedAppearance", JSON.stringify(realLooks));
      }
      if (realAge && parseInt(realAge) >= 1) {
        formData.append("age", realAge);
      }

      const response = await api.post("/onboarding/trial-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setCreatedModelId(response.data.model.id);
        setGeneratedPortrait(response.data.model.photo1Url);
        await refreshUserCredits();
        setStep(STEP.REAL_PREVIEW);
        toast.success("Model created!");
        
        // Auto-generate a preview image with "selfie smiling" prompt
        generatePreviewImage(response.data.model.id, response.data.model.photo1Url);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      const message = error.response?.data?.message || "Upload failed. Please try again.";
      
      if (error.response?.data?.code === "TRIAL_ALREADY_USED") {
        toast.error("You've already used your free trial");
        navigate("/dashboard");
      } else {
        toast.error(message);
        setStep(STEP.REAL_UPLOAD);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate preview for real model path - polls until complete
  const generatePreviewImage = async (modelId, photoUrl) => {
    setIsGeneratingPreview(true);
    try {
      // Use existing image generation endpoint with dramatic scene change prompt
      const response = await api.post("/generate/prompt-image", {
        modelId,
        prompt: "woman sitting in a cozy cafe, holding a coffee cup, warm lighting, cafe interior background with other customers, wooden tables, plants, large windows",
        contentRating: "pg13",
        style: "professional",
      });
      
      console.log("Preview generation response:", response.data);
      
      // Get generation ID - could be in generationId or generation.id
      const generationId = response.data.generationId || response.data.generation?.id;
      
      if (response.data.success && generationId) {
        // Poll for completion (the generation is async)
        let attempts = 0;
        const maxAttempts = 90; // 90 seconds max wait (generation can take a while)
        
        const pollForResult = async () => {
          while (attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
            
            try {
              const statusResponse = await api.get("/generations");
              const generation = statusResponse.data.generations?.find(g => g.id === generationId);
              
              console.log(`Poll ${attempts}: Generation ${generationId} status:`, generation?.status);
              
              if (generation?.status === "completed" && generation?.outputUrl) {
                console.log("Preview generation completed:", generation.outputUrl);
                setPreviewImage(generation.outputUrl);
                return;
              } else if (generation?.status === "failed") {
                console.error("Preview generation failed");
                setPreviewImage(photoUrl);
                return;
              }
              // Still pending/processing - continue polling
            } catch (pollError) {
              console.error("Poll error:", pollError);
            }
          }
          // Timeout - use fallback
          console.log("Preview generation timed out, using fallback");
          setPreviewImage(photoUrl);
        };
        
        await pollForResult();
      } else if (response.data.outputUrl) {
        // Direct result (in case it's synchronous)
        setPreviewImage(response.data.outputUrl);
      } else {
        // No generation started - use fallback
        setPreviewImage(photoUrl);
      }
    } catch (error) {
      console.error("Preview generation failed:", error);
      // Don't show error - just use the uploaded photo as fallback
      setPreviewImage(photoUrl);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Handle special offer purchase for AI model - open embedded checkout
  const handleSpecialOffer = () => {
    setShowCheckoutModal(true);
  };

  // Handle successful special offer payment
  const handleSpecialOfferSuccess = async (result) => {
    setShowCheckoutModal(false);
    setStep(STEP.AI_PROCESSING);
    await refreshUserCredits();
    
    // Track Meta Pixel Purchase event
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: 6.00,
        currency: 'USD',
        content_name: 'AI Model Creation - Special Offer'
      });
    }
    
    // If model is still generating, poll for completion
    if (result?.modelStatus === 'generating' && result?.model?.id) {
      toast.success("Payment confirmed! Creating your AI model...");
      
      // Poll for model completion (can take several minutes)
      const modelId = result.model.id;
      const maxAttempts = 300; // 10 minutes at 2-second intervals
      
      pollModelUntilReady({
        apiClient: api,
        modelId,
        maxAttempts,
        intervalMs: 2000,
        onAttemptError: (error) => {
          console.error("Model status check failed:", error);
        },
      }).then((pollResult) => {
        if (pollResult.ready) {
          toast.success("Your AI model is ready!");
          navigate("/dashboard");
          return;
        }
        // Timeout - navigate anyway (model will finish in background)
        toast.success("Welcome to ModelClone!");
        navigate("/dashboard");
      });
    } else if (result?.success) {
      // Model was already ready or fallback
      toast.success("Welcome to ModelClone! Your AI model is ready.");
      navigate("/dashboard");
    } else {
      // Fallback - payment was processed but we didn't get expected response
      console.warn("Special offer success without expected result:", result);
      toast.success("Welcome to ModelClone!");
      navigate("/dashboard");
    }
  };

  // Check for returning from Stripe checkout - use useEffect to prevent double execution
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session_id");
  const offerStatus = urlParams.get("offer");
  const verificationRef = useRef(false);
  
  useEffect(() => {
    // Only run once when returning from Stripe with success
    if (sessionId && offerStatus === "success" && !verificationRef.current) {
      verificationRef.current = true;
      setStep(STEP.AI_PROCESSING);
      
      (async () => {
        try {
          const response = await api.post("/stripe/verify-special-offer", { sessionId });
          if (response.data.success) {
            // Track Meta Pixel Purchase event (redirect flow)
            if (typeof window.fbq === 'function') {
              window.fbq('track', 'Purchase', {
                value: 6.00,
                currency: 'USD',
                content_name: 'AI Model Creation - Special Offer'
              });
            }
            toast.success("Welcome to ModelClone! Your AI model is ready.");
            await refreshUserCredits();
            // Clear URL params to prevent re-verification on refresh
            window.history.replaceState({}, document.title, "/onboarding");
            navigate("/dashboard");
          }
        } catch (error) {
          console.error("Verification failed:", error);
          // Still navigate - the webhook likely processed it
          toast.success("Welcome to ModelClone!");
          await refreshUserCredits();
          navigate("/dashboard");
        }
      })();
    }
  }, [sessionId, offerStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShowBlurredPreview = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    // Show fake generating step with delay (3-5 seconds)
    setStep(STEP.REAL_GENERATING);
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
    setStep(STEP.REAL_BLURRED);
  };

  const handleGenerateMore = async () => {
    try {
      await api.post("/onboarding/complete");
      await refreshUserCredits();
      navigate("/dashboard?openCredits=true");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleContinueToDashboard = async () => {
    try {
      // Lock the special offer forever when user skips
      await api.post("/onboarding/lock-offer");
      await refreshUserCredits();
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const renderProgressIndicator = () => {
    let currentStep = 0;
    let totalSteps = 3;
    
    if (path === "ai") {
      if (step >= STEP.AI_RESULT) currentStep = 3;
      else if (step >= STEP.AI_PROMPT) currentStep = 2;
      else if (step >= STEP.AI_CONFIG) currentStep = 1;
    } else if (path === "real") {
      if (step >= STEP.REAL_RESULT) currentStep = 3;
      else if (step >= STEP.REAL_PROMPT) currentStep = 2;
      else if (step >= STEP.REAL_UPLOAD) currentStep = 1;
    }
    
    if (currentStep === 0) return null;
    
    return (
      <div className="flex items-center gap-1.5 mb-8 px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 relative">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${
              s <= currentStep 
                ? "bg-white" 
                : "bg-white/10"
            }`} />
            {s <= currentStep && s === currentStep && (
              <div className="absolute inset-0 h-1.5 rounded-full bg-white blur-sm opacity-50" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderLoadingState = (message) => (
    <div className="text-center py-12">
      <div className="relative w-20 h-20 mx-auto mb-6">
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full bg-white/10"
        />
        {/* Inner circle */}
        <div 
          className="absolute inset-4 rounded-full flex items-center justify-center bg-white/20"
        >
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      </div>
      <h2 className="text-lg md:text-xl font-bold mb-1.5 text-white">{message}</h2>
      <p className="text-slate-400 text-xs md:text-sm">This usually takes 15-30 seconds</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Premium animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Subtle gradient backdrop */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-25"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
        {/* Subtle noise texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
        />
        {/* Radial fade from center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Premium header with glass effect */}
        <header className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img src="/logo-512.png" alt="ModelClone" className="w-9 h-9 rounded-xl object-cover" />
            </div>
            <span className="font-bold text-lg text-white">ModelClone</span>
          </div>
        </header>

        <main className="flex-1 flex items-start md:items-center justify-center px-4 pb-8 pt-2 md:pt-0 overflow-y-auto">
          <div className="w-full max-w-lg">
            {renderProgressIndicator()}

            {step === STEP.CHOOSE && (
              <div className="text-center">
                {/* Premium FREE badge with glow */}
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-6">
                  <div className="relative">
                    <Gift className="w-4 h-4 text-green-400" />
                    <div className="absolute inset-0 blur-sm bg-green-400/50" />
                  </div>
                  <span className="text-sm text-green-300 font-bold tracking-wide">100% FREE TRIAL</span>
                </div>

                <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-3 leading-tight">
                  <span className="text-white">What would you like</span>
                  <br />
                  <span className="text-white">to create?</span>
                </h1>
                <p className="text-slate-400 text-sm md:text-base mb-8 max-w-sm mx-auto">
                  Try one free generation to experience the AI quality
                </p>

                {/* Premium glassmorphism cards */}
                <div className="space-y-4">
                  <button
                    onClick={() => handleChoosePath("ai")}
                    className="group w-full relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform duration-200"
                    data-testid="button-choose-ai"
                  >
                    {/* Glass background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/5 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 group-hover:border-white/20 group-hover:from-white/8" />
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full" style={{ transition: "transform 0.8s ease-out, opacity 0.3s" }} />
                    
                    <div className="relative p-4 md:p-5 flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/10 flex items-center justify-center transition-shadow">
                          <Wand2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-white/10 blur-xl opacity-0 transition-opacity" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-bold text-base md:text-lg mb-0.5 text-white group-hover:text-white transition-colors">
                          Create AI Model
                        </h3>
                        <p className="text-xs md:text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                          Generate a unique face and unlimited content
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleChoosePath("real")}
                    className="group w-full relative overflow-hidden rounded-2xl active:scale-[0.98] transition-transform duration-200"
                    data-testid="button-choose-real"
                  >
                    {/* Glass background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/5 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transition-all duration-300 group-hover:border-white/20 group-hover:from-white/8" />
                    {/* Shimmer effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full" style={{ transition: "transform 0.8s ease-out, opacity 0.3s" }} />
                    
                    <div className="relative p-4 md:p-5 flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/10 flex items-center justify-center">
                          <Camera className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-white/10 blur-xl opacity-0 transition-opacity" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h3 className="font-bold text-base md:text-lg mb-0.5 text-white group-hover:text-white transition-colors">
                          Use Real Photos
                        </h3>
                        <p className="text-xs md:text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                          Upload your photos and create AI content
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleContinueToDashboard}
                  className="mt-8 py-2.5 px-6 text-slate-500 hover:text-slate-300 active:text-white text-xs font-medium transition-colors"
                  data-testid="button-skip-onboarding"
                >
                  Skip to dashboard →
                </button>
              </div>
            )}

            {step === STEP.AI_NAME && (
              <div>
                <button
                  onClick={() => setStep(STEP.CHOOSE)}
                  className="group text-xs text-slate-400 active:text-white mb-6 flex items-center gap-1.5 py-1.5 px-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                <div className="text-center mb-8">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl opacity-0" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1.5">
                    <span className="text-white">Name Your AI Model</span>
                  </h2>
                  <p className="text-slate-400 text-sm">Give your creation a unique identity</p>
                </div>

                {/* Glassmorphism input card */}
                <div className="relative p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 mb-4">
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="e.g. Luna, Alex, Sofia..."
                    className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-white/40 focus:bg-white/10 text-center text-lg font-medium transition-all"
                    data-testid="input-model-name"
                    maxLength={30}
                  />
                  
                  <p className="text-[11px] text-slate-500 text-center mt-3">
                    This name will identify your model
                  </p>
                </div>

                <button
                  onClick={() => setStep(STEP.AI_CONFIG)}
                  disabled={!modelName.trim()}
                  className="group w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90"
                  data-testid="button-continue-to-design"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}

            {step === STEP.AI_CONFIG && (
              <div>
                <button
                  onClick={() => setStep(STEP.AI_NAME)}
                  className="group text-xs text-slate-400 active:text-white mb-5 flex items-center gap-1.5 py-1.5 px-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold mb-1.5">
                    <span className="text-white">Design Your AI Model</span>
                  </h2>
                  <p className="text-slate-400 text-sm">Customize the appearance</p>
                </div>

                {/* Glassmorphism form card */}
                <div className="relative p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
                  {/* Gender Selection */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Gender <span className="text-slate-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENDER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, gender: option.value })}
                          className={`py-3 px-3 rounded-xl border transition-all text-sm font-medium active:scale-[0.97] ${
                            aiConfig.gender === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-gender-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Age <span className="text-slate-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={aiConfig.age}
                      onChange={(e) => setAiConfig({ ...aiConfig, age: e.target.value })}
                      placeholder="e.g. 25"
                      className="w-28 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                      Body Type
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BODY_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, bodyType: option.value })}
                          className={`py-2.5 px-2 rounded-lg border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.bodyType === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-body-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Heritage */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Heritage
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {HERITAGE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, heritage: option.value })}
                          className={`py-2.5 px-2 rounded-lg border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.heritage === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-heritage-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Color */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      Hair Color
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {HAIR_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, hairColor: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.hairColor === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-hair-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Length */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      Hair Length
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {HAIR_LENGTH_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, hairLength: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.hairLength === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-hairlength-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Texture */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Palette className="w-3.5 h-3.5 text-slate-400" />
                      Hair Texture
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {HAIR_TEXTURE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, hairTexture: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.hairTexture === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-hairtexture-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Eye Color */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      Eye Color
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EYE_COLOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, eyeColor: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.eyeColor === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-eye-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lip Size */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Heart className="w-3.5 h-3.5 text-slate-400" />
                      Lip Size
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {LIP_SIZE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, lipSize: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.lipSize === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-lipsize-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Face Type */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Face Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FACE_TYPE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, faceType: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.faceType === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-facetype-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style / Makeup */}
                  <div>
                    <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 text-slate-300">
                      <Wand2 className="w-3.5 h-3.5 text-slate-400" />
                      Style
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {STYLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setAiConfig({ ...aiConfig, style: option.value })}
                          className={`py-2 px-3 rounded-full border transition-all text-xs font-medium active:scale-[0.97] ${
                            aiConfig.style === option.value
                              ? "border-white/40 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                          }`}
                          data-testid={`button-style-${option.value}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                <button
                  onClick={handleGenerateAIPortrait}
                  disabled={!isAiConfigComplete}
                  className="group w-full mt-5 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90"
                  data-testid="button-generate-portrait"
                >
                  <Zap className="w-5 h-5" />
                  Generate Portrait
                </button>
                
                {!isAiConfigComplete && (
                  <p className="text-xs text-slate-500 text-center mt-3">
                    Select all options to continue
                  </p>
                )}
              </div>
            )}

            {step === STEP.AI_GENERATING && renderLoadingState("Creating Your AI Model")}

            {step === STEP.AI_OFFER && (
              <div className="text-center">
                {/* Premium Timer with glow */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="relative px-3 py-1.5 rounded-full bg-red-500/10 backdrop-blur-sm border border-red-500/30 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[11px] text-red-200 font-medium">Offer ends in</span>
                    <span className="text-sm font-mono font-bold text-white">{formatTime(timeLeft)}</span>
                  </div>
                </div>

                {/* Hero Section with Image - Premium styling */}
                <div className="relative mb-5">
                  <div className="relative w-28 h-28 md:w-36 md:h-36 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl opacity-0" />
                    <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/20">
                      <img
                        src={generatedPortrait}
                        alt="Your AI Model"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 backdrop-blur-sm">
                    <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  </div>
                </div>

                {/* Main Headline */}
                <h2 className="text-xl md:text-2xl font-bold mb-1">
                  <span className="text-white">Turn Your AI Into Income</span>
                </h2>
                <p className="text-slate-400 text-xs md:text-sm mb-5">
                  Top creators earn <span className="text-green-400 font-bold">$10K+ monthly</span> with AI content
                </p>

                {/* Premium Glassmorphism Card */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/8 via-white/5 to-white/3 backdrop-blur-xl border border-white/15 mb-4 outline-none" tabIndex={-1}>
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-transparent pointer-events-none" />
                  
                  {/* Price Row */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="text-left">
                      <p className="text-[11px] text-slate-500 line-through mb-0.5">Regular $10</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl md:text-4xl font-bold text-white">$6</span>
                        <span className="text-[11px] text-slate-400 font-medium">one-time</span>
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
                      <span className="text-green-400 text-xs font-bold">Save 40%</span>
                    </div>
                  </div>

                  {/* What You Get - Premium styling */}
                  <div className="relative space-y-2.5 mb-5">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 select-none hover:bg-white/8 transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">Scale to $10K Course</p>
                        <p className="text-slate-400 text-[11px]">By industry leaders in AI content</p>
                      </div>
                      <span className="text-[10px] text-white bg-white/15 px-2 py-1 rounded-full font-bold flex-shrink-0">FREE</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 select-none hover:bg-white/8 transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">Generation Credits</p>
                        <p className="text-slate-400 text-[11px]">Create multiple photos and videos</p>
                      </div>
                      <span className="text-[10px] text-white bg-white/15 px-2 py-1 rounded-full font-bold flex-shrink-0">FREE</span>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 select-none hover:bg-white/8 transition-colors">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">Your AI Model Forever</p>
                        <p className="text-slate-400 text-[11px]">Generate unlimited content</p>
                      </div>
                      <span className="text-[10px] text-white bg-white/15 px-2 py-1 rounded-full font-bold flex-shrink-0">FREE</span>
                    </div>
                  </div>

                  {/* Premium CTA Button */}
                  <button
                    onClick={handleSpecialOffer}
                    className="group relative w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] overflow-hidden bg-white text-black hover:bg-white/90"
                    data-testid="button-special-offer"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Start Earning Now - $6
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-black/5 to-transparent" />
                  </button>
                  
                  {/* Trust Row */}
                  <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-green-400" />
                      Secure
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-slate-400" />
                      Instant
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3 h-3 text-slate-400" />
                      4.9 rating
                    </span>
                  </div>
                  
                  {/* Money Back Guarantee */}
                  <div className="mt-4 py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-emerald-400 text-xs font-medium flex items-center justify-center gap-2">
                      <Shield className="w-3.5 h-3.5" />
                      30-Day Money Back Guarantee
                    </p>
                  </div>
                  
                  {/* Social Proof */}
                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                    <div className="flex -space-x-2">
                      <div className="w-5 h-5 rounded-full bg-white/30 border border-slate-800" />
                      <div className="w-5 h-5 rounded-full bg-white/20 border border-slate-800" />
                      <div className="w-5 h-5 rounded-full bg-white/10 border border-slate-800" />
                    </div>
                    <span><strong className="text-white">2,847</strong> creators joined this week</span>
                  </div>
                </div>

                {/* Skip Link */}
                <button
                  onClick={handleContinueToDashboard}
                  className="text-slate-500 hover:text-slate-300 active:text-white transition-colors text-xs py-3 font-medium"
                  data-testid="button-skip-offer"
                >
                  Skip for now
                </button>
              </div>
            )}

            {step === STEP.AI_PROCESSING && (
              <div className="text-center py-12">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-white/10" />
                  <div className="absolute inset-4 rounded-full flex items-center justify-center bg-white/20">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                </div>
                <h2 className="text-lg md:text-xl font-bold mb-1.5 text-white">Generating AI Model...</h2>
                <p className="text-slate-400 text-xs md:text-sm mb-3">This can take up to a few minutes</p>
                <p className="text-amber-400/80 text-xs font-medium flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Please don't close this window
                </p>
              </div>
            )}

            {step === STEP.REAL_UPLOAD && (
              <div>
                <button
                  onClick={() => setStep(STEP.CHOOSE)}
                  className="group text-xs text-slate-400 active:text-white mb-5 flex items-center gap-1.5 py-1.5 px-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold mb-1.5">
                    <span className="text-white">Upload Your Photos</span>
                  </h2>
                  <p className="text-slate-400 text-sm">2 face photos and 1 body photo</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  <PhotoUploadSlot
                    label="Face 1"
                    file={realPhotos.face1}
                    onFileSelect={(file) => setRealPhotos({ ...realPhotos, face1: file })}
                    onRemove={() => setRealPhotos({ ...realPhotos, face1: null })}
                    required
                  />
                  <PhotoUploadSlot
                    label="Face 2"
                    file={realPhotos.face2}
                    onFileSelect={(file) => setRealPhotos({ ...realPhotos, face2: file })}
                    onRemove={() => setRealPhotos({ ...realPhotos, face2: null })}
                    required
                  />
                  <PhotoUploadSlot
                    label="Body"
                    file={realPhotos.body}
                    onFileSelect={(file) => setRealPhotos({ ...realPhotos, body: file })}
                    onRemove={() => setRealPhotos({ ...realPhotos, body: null })}
                    required
                  />
                </div>

                {/* Model Looks Configuration */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Model Looks <span className="text-slate-500 font-normal normal-case">(optional)</span></h3>
                    <button
                      onClick={handleAutoDetectLooks}
                      disabled={autoDetecting || (!realPhotos.face1 && !realPhotos.face2 && !realPhotos.body)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 active:scale-[0.97] border border-violet-500/40 bg-violet-500/15 text-violet-300 hover:bg-violet-500/25"
                    >
                      {autoDetecting ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Detecting…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> AI Auto-Assign</>
                      )}
                    </button>
                  </div>

                  {/* Age input */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Age</p>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={realAge}
                      onChange={(e) => setRealAge(e.target.value)}
                      placeholder="e.g. 25"
                      className="w-24 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  {[
                    { key: "gender",      label: "Gender",       options: GENDER_OPTIONS },
                    { key: "heritage",    label: "Heritage",     options: HERITAGE_OPTIONS },
                    { key: "bodyType",    label: "Body Type",    options: BODY_TYPE_OPTIONS },
                    { key: "hairColor",   label: "Hair Color",   options: HAIR_COLOR_OPTIONS },
                    { key: "hairLength",  label: "Hair Length",  options: HAIR_LENGTH_OPTIONS },
                    { key: "hairTexture", label: "Hair Texture", options: HAIR_TEXTURE_OPTIONS },
                    { key: "eyeColor",    label: "Eye Color",    options: EYE_COLOR_OPTIONS },
                    { key: "faceType",    label: "Face Type",    options: FACE_TYPE_OPTIONS },
                    { key: "lipSize",     label: "Lips",         options: LIP_SIZE_OPTIONS },
                    { key: "style",       label: "Makeup",       options: STYLE_OPTIONS },
                  ].map(({ key, label, options }) => (
                    <div key={key}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setRealLooks(prev => ({
                              ...prev,
                              [key]: prev[key] === opt.value ? undefined : opt.value,
                            }))}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] ${
                              realLooks[key] === opt.value
                                ? "border-white/40 bg-white/15 text-white"
                                : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-5">
                  <p className="text-xs text-yellow-200">
                    <strong>Tip:</strong> Use clear, well-lit photos with your face visible.
                  </p>
                </div>

                <button
                  onClick={handleUploadRealPhotos}
                  disabled={!realPhotos.face1 || !realPhotos.face2 || !realPhotos.body}
                  className="w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-white text-black hover:bg-white/90"
                  data-testid="button-upload-photos"
                >
                  <Upload className="w-5 h-5" />
                  Create My Model
                </button>
              </div>
            )}

            {step === STEP.REAL_UPLOADING && renderLoadingState("Creating Your Model")}

            {step === STEP.REAL_PREVIEW && (
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold mb-1">Your Model is Ready!</h2>
                <p className="text-slate-400 text-sm mb-4">Here's a preview of what you can create</p>

                <div className="rounded-xl overflow-hidden border border-white/10 mb-4 relative max-w-xs mx-auto">
                  {isGeneratingPreview ? (
                    <div className="w-full aspect-square bg-white/5 flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-2" />
                      <p className="text-xs text-slate-400">Generating preview...</p>
                    </div>
                  ) : (
                    <img
                      src={previewImage || generatedPortrait}
                      alt="Preview"
                      className="w-full aspect-square object-cover"
                    />
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  {isGeneratingPreview ? "Creating a sample image..." : "This is just a taste of what's possible!"}
                </p>

                <button
                  onClick={() => setStep(STEP.REAL_PROMPT)}
                  disabled={isGeneratingPreview}
                  className="w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-white text-black hover:bg-white/90"
                  data-testid="button-generate-own"
                >
                  <Wand2 className="w-5 h-5" />
                  Generate My Own Prompt
                </button>
              </div>
            )}

            {step === STEP.REAL_PROMPT && (
              <div>
                <button
                  onClick={() => setStep(STEP.REAL_PREVIEW)}
                  className="text-xs text-slate-400 active:text-white mb-4 flex items-center gap-1 py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>

                <div className="text-center mb-4">
                  <h2 className="text-xl md:text-2xl font-bold mb-1">Create Your Image</h2>
                  <p className="text-slate-400 text-sm">Describe what you want to see</p>
                </div>

                <div className="rounded-xl overflow-hidden border border-white/10 mb-4 max-w-[200px] mx-auto">
                  <img
                    src={generatedPortrait}
                    alt="Your Model"
                    className="w-full aspect-square object-cover"
                  />
                </div>

                <div className="mb-5">
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium mb-2">
                    Describe your image
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., professional headshot in a modern office..."
                    className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-white/40"
                    rows={3}
                    data-testid="input-prompt-real"
                  />
                </div>

                <button
                  onClick={handleShowBlurredPreview}
                  disabled={!prompt.trim()}
                  className="w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 bg-white text-black hover:bg-white/90"
                  data-testid="button-generate-image-real"
                >
                  <ImageIcon className="w-5 h-5" />
                  Generate Image
                </button>
              </div>
            )}

            {step === STEP.REAL_GENERATING && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" />
                  <Zap className="absolute inset-0 m-auto w-6 h-6 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold mb-1">Creating Your Image</h2>
                <p className="text-slate-400 text-sm">Usually takes 10-30 seconds...</p>
              </div>
            )}

            {step === STEP.REAL_BLURRED && (
              <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold mb-1">Preview Ready!</h2>
                <p className="text-slate-400 text-sm mb-4">Get credits to see the full result</p>

                <div className="relative rounded-xl overflow-hidden mb-5 border border-white/10 max-w-xs mx-auto">
                  <img
                    src={previewImage || generatedPortrait}
                    alt="Preview"
                    className="w-full aspect-[3/4] object-cover"
                    style={{ filter: "blur(40px) brightness(0.5) saturate(0.7)", transform: "scale(1.2)" }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 border border-white/20">
                      <Zap className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold mb-0.5">Your image is ready!</p>
                    <p className="text-xs text-slate-300">Unlock to see the result</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-base">Unlock Full Access</span>
                  </div>
                  <p className="text-slate-300 text-xs mb-4">
                    Get credits to see this image and generate unlimited photos, videos, and face swaps!
                  </p>

                  <button
                    onClick={handleGenerateMore}
                    className="w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-white text-black hover:bg-white/90"
                    data-testid="button-get-credits-real"
                  >
                    <Zap className="w-5 h-5" />
                    Get Credits
                  </button>
                </div>

                <button
                  onClick={handleContinueToDashboard}
                  className="text-slate-500 active:text-white transition-colors text-[11px] py-2"
                  data-testid="button-continue-dashboard-real"
                >
                  Continue to dashboard →
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        item={{
          price: 6,
          credits: 250,
          name: "AI Model + Credits",
          referenceUrl: generatedPortrait,
          aiConfig: { ...aiConfig, modelName },
        }}
        itemType="special-offer"
        onSuccess={handleSpecialOfferSuccess}
      />
    </div>
  );
}
