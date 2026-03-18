import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import CursorGlow from '../components/CursorGlow';
import { useNavigate, Navigate } from 'react-router-dom';
import { User, Users, ArrowRight, Check, Wand2 } from 'lucide-react';
import { useState, useSyncExternalStore, useEffect, useRef } from 'react';
import { useAuthStore } from '../store';

function useHasHydrated() {
  return useSyncExternalStore(
    (callback) => useAuthStore.persist.onFinishHydration(callback),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );
}

const KEYS = ['creator', 'agency', 'createModel'];

export default function SelectUserTypePage() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('creator');
  const [sessionValid, setSessionValid] = useState(null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useHasHydrated();
  const checkedRef = useRef(false);

  // Gate: never redirect or run session check before hydration (avoids dev loop from auth redirect before session ready)
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse text-white/50 text-sm">Loading…</div>
      </div>
    );
  }

  // Verify session before redirecting to dashboard — avoids loop from stale auth → dashboard → 401 → login → /
  useEffect(() => {
    if (!isAuthenticated || checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      try {
        const { authAPI } = await import('../services/api');
        const res = await authAPI.getProfile();
        if (res?.success) setSessionValid(true);
        else setSessionValid(false);
      } catch {
        setSessionValid(false);
        try {
          useAuthStore.setState({ user: null, isAuthenticated: false });
        } catch (_) {}
      }
    })();
  }, [isAuthenticated]); // hasHydrated stable true after gate above

  if (isAuthenticated && sessionValid === true) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleContinue = () => {
    if (selectedType === 'createModel') {
      navigate('/create-ai-model');
    } else {
      localStorage.setItem('userType', selectedType);
      navigate(`/landing?type=${selectedType}`);
    }
  };

  const userTypes = {
    creator: {
      type: 'creator',
      icon: User,
      title: "I'm a Creator",
      subtitle: 'Content Creator / Influencer',
      description: 'Scale your content output without the burnout of constant filming. One setup, unlimited content.',
      benefits: ['Create 10\u00d7 more content', 'Stop filming 4+ hours daily', 'Grow your audience 3\u20135\u00d7 faster', 'Keep your privacy'],
      stats: [
        { label: 'Time Saved', value: '90%' },
        { label: 'Content Output', value: '10\u00d7' },
        { label: 'Audience Growth', value: '3\u20135\u00d7' },
      ],
    },
    agency: {
      type: 'agency',
      icon: Users,
      title: "I'm an Agency",
      subtitle: 'Talent Management / Agency Owner',
      description: 'Scale your roster without creator dependency or the overhead of hiring more staff.',
      benefits: ['Manage 10+ creators efficiently', 'Never depend on unreliable creators', 'Scale without hiring costs', 'Increase growth per creator 3\u00d7'],
      stats: [
        { label: 'Creators Managed', value: '10+' },
        { label: 'Cost Reduction', value: '80%' },
        { label: 'Growth Per Creator', value: '3\u00d7' },
      ],
    },
    createModel: {
      type: 'createModel',
      icon: Wand2,
      title: 'Create AI Model',
      subtitle: 'Build an AI Model from Scratch',
      description: 'Design a unique AI model in seconds \u2014 choose attributes, generate, and start creating content immediately.',
      benefits: ['Ready in seconds', 'No technical knowledge needed', 'Choose any attributes', 'Unlimited creative possibilities'],
      stats: [
        { label: 'Setup Time', value: '30s' },
        { label: 'Attributes', value: '5+' },
        { label: 'AI Accuracy', value: '99%' },
      ],
      isSpecial: true,
    },
  };

  const currentType = userTypes[selectedType];

  const selectedIdx = KEYS.indexOf(selectedType);
  const displayOrder = [
    KEYS[(selectedIdx + 2) % 3],
    KEYS[selectedIdx],
    KEYS[(selectedIdx + 1) % 3],
  ];

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center px-4 sm:px-6 py-12 overflow-x-hidden relative"
      style={{ background: '#07070b' }}
    >
      <CursorGlow />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(ellipse at center, #7c3aed 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse at center, #a78bfa 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto w-full">

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2.5 mb-10"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-xl blur-md opacity-60" style={{ background: 'rgba(139,92,246,0.4)' }} />
            <img src="/logo-512.png" alt="ModelClone" className="relative w-9 h-9 rounded-xl object-cover ring-1 ring-white/10" />
          </div>
          <span className="text-xl font-bold tracking-tight">ModelClone</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="text-center mb-8"
        >
          <p className="text-[10px] font-medium tracking-[0.22em] uppercase mb-3 text-white/30">
            Welcome
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight text-white">
            How are you using ModelClone?
          </h1>
          <p className="text-sm max-w-md mx-auto text-white/40">
            Select your path — we'll tailor the experience for you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="grid grid-cols-3 gap-2.5 mb-5"
        >
          <LayoutGroup id="tabs">
            {displayOrder.map((typeKey, position) => {
              const type = userTypes[typeKey];
              const isCenter = position === 1;

              return (
                <motion.button
                  key={typeKey}
                  layout
                  onClick={() => setSelectedType(typeKey)}
                  animate={{
                    scale: isCenter ? 1 : 0.82,
                    opacity: isCenter ? 1 : 0.42,
                  }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                  className="relative p-4 sm:p-5 rounded-2xl text-left overflow-hidden origin-center"
                  style={isCenter ? {
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  } : {
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                  data-testid={`tab-${typeKey}`}
                >
                  {isCenter && (
                    <span
                      className="pointer-events-none absolute top-0 left-0 rounded-full"
                      style={{
                        width: '140px',
                        height: '140px',
                        transform: 'translate(-50%, -50%)',
                        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(139,92,246,0.1) 40%, transparent 70%)',
                      }}
                    />
                  )}

                  <div className="relative flex flex-col items-center gap-2.5 text-center">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={isCenter ? {
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.14)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                    >
                      <type.icon className="w-4 h-4" style={{ color: isCenter ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight" style={{ color: isCenter ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                        {type.title}
                      </p>
                      <p className="text-[10px] hidden sm:block mt-0.5 text-white/30">
                        {type.subtitle}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </LayoutGroup>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="relative rounded-2xl p-5 sm:p-7 mb-6 overflow-hidden"
            style={{
              background: 'rgba(20,16,32,0.6)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 40px rgba(0,0,0,0.4), 0 0 60px rgba(139,92,246,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <span
              className="pointer-events-none absolute"
              style={{
                top: 0,
                left: 0,
                width: '320px',
                height: '320px',
                transform: 'translate(-30%, -30%)',
                background: 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.06) 40%, transparent 65%)',
                borderRadius: '50%',
              }}
            />
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 60%, transparent 100%)' }}
            />

            <p className="relative text-sm leading-relaxed mb-6 text-white/60">
              {currentType.description}
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 relative">
              {currentType.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-[10px] mt-0.5 text-white/35 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mb-6 relative">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] mb-3 text-white/30">
                What you get
              </p>
              <ul className="grid sm:grid-cols-2 gap-2">
                {currentType.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5 text-sm text-white/75">
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                    >
                      <Check className="w-2.5 h-2.5 text-white/70" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleContinue}
              className="relative mx-auto block py-3 px-10 rounded-xl font-semibold text-black bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-2 overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.9), 0 0 32px 8px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,1)' }}
              data-testid={`button-continue-${selectedType}`}
            >
              <span
                className="pointer-events-none absolute top-0 left-0 rounded-full"
                style={{
                  width: '100px',
                  height: '100px',
                  transform: 'translate(-35%, -45%)',
                  background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)',
                }}
              />
              <span className="relative z-10">
                {selectedType === 'createModel' ? 'Learn More' : `Continue as ${currentType.type === 'creator' ? 'Creator' : 'Agency'}`}
              </span>
              <ArrowRight className="w-4 h-4 relative z-10" />
            </button>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-3"
        >
          <p className="text-xs text-white/50">
            Not sure? Pick one to explore — you can always switch later.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span className="text-white/70">Already a member?</span>
            <a
              href="/login"
              className="font-semibold transition hover:text-white"
              style={{ color: '#e2d9ff' }}
              data-testid="link-login"
            >
              Log in
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
