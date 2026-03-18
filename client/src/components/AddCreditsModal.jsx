import { useState, useEffect, useCallback, memo } from 'react';
import { X, Zap, Sparkles, Check, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import { stripeAPI } from '../services/api';
import CheckoutModal from './CheckoutModal';

const SUBSCRIPTION_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 2900,
    price: 29,
    annualPrice: 289,
    popular: false,
    pricePerCredit: 0.010,
    bonusCredits: 0,
    savings: { amount: 59, percent: 17 }
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 8900,
    price: 79,
    annualPrice: 787,
    popular: true,
    pricePerCredit: 0.0089,
    bonusCredits: 1000,
    savings: { amount: 161, percent: 17 }
  },
  {
    id: 'business',
    name: 'Business',
    credits: 24900,
    price: 199,
    annualPrice: 1982,
    popular: false,
    pricePerCredit: 0.0080,
    bonusCredits: 5000,
    savings: { amount: 406, percent: 17 }
  }
];

function formatPerCredit(value) {
  return value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

const PricingCard = memo(function PricingCard({ tier, billingCycle, onPurchase, isLoading }) {
  const displayPrice = billingCycle === 'annual' ? tier.annualPrice : tier.price;
  
  return (
    <div className={`relative rounded-xl p-3 sm:p-4 transition-all duration-200 active:scale-[0.98] ${
      tier.popular 
        ? 'glass-card border-white/20' 
        : 'glass-card'
    }`}>
      {tier.popular && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full glass-card border border-white/20 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-white whitespace-nowrap">
          Popular
        </div>
      )}
      
      <div className="text-center pt-2">
        <h3 className={`font-bold text-xs sm:text-sm mb-1 ${tier.popular ? 'text-white' : 'text-slate-300'}`}>
          {tier.name}
        </h3>
        
        <div className="flex items-center justify-center gap-1 mb-1">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
          <span className="text-lg sm:text-2xl font-bold text-white">{tier.credits.toLocaleString()}</span>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 sm:mb-2 inline-flex items-center gap-0.5"><Coins className="w-3 h-3 text-yellow-400" />/mo</p>
        
        {tier.bonusCredits > 0 && (
          <div className="text-[9px] sm:text-[10px] text-green-400 font-medium mb-1.5 sm:mb-2">
            +{tier.bonusCredits} bonus
          </div>
        )}
        
        <div className="border-t border-white/10 pt-2 sm:pt-3 mt-1.5 sm:mt-2">
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-lg sm:text-xl font-bold text-white">${displayPrice}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-400">${formatPerCredit(tier.pricePerCredit)}/credit</p>
          
          {billingCycle === 'annual' && (
            <p className="text-[9px] sm:text-[10px] text-green-400 mt-0.5 sm:mt-1">Save ${tier.savings.amount}/yr</p>
          )}
        </div>
        
        <button
          onClick={() => onPurchase(tier)}
          disabled={isLoading}
          className={`relative w-full mt-2.5 sm:mt-3 py-2 sm:py-2.5 px-1 rounded-lg font-semibold text-xs sm:text-sm transition-all active:scale-[0.97] disabled:opacity-50 overflow-hidden ${
            tier.popular
              ? 'bg-white text-black hover:bg-white/90'
              : 'bg-white/10 text-white border border-white/10'
          }`}
          data-testid={`button-subscribe-${tier.id}`}
        >
          {tier.popular && (
            <>
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-white/20 rounded-full blur-xl pointer-events-none" />
              <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-white/15 rounded-full blur-xl pointer-events-none" />
            </>
          )}
          <span className="relative z-10">{isLoading ? '...' : 'Get'}</span>
        </button>
      </div>
    </div>
  );
});

export default function AddCreditsModal({ isOpen, onClose, sidebarCollapsed = false }) {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loadingTier, setLoadingTier] = useState(null);
  const [purchaseType, setPurchaseType] = useState('subscription');
  const [creditAmount, setCreditAmount] = useState(5000);
  const [isVisible, setIsVisible] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutItemType, setCheckoutItemType] = useState(null);
  
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);
  
  const handlePurchase = useCallback((tier) => {
    setCheckoutItem({
      ...tier,
      billingCycle,
    });
    setCheckoutItemType('subscription');
    setCheckoutOpen(true);
  }, [billingCycle]);

  const handleOneTimePurchase = useCallback(() => {
    const price = Math.round(creditAmount * 0.012);
    setCheckoutItem({
      credits: creditAmount,
      price,
    });
    setCheckoutItemType('credits');
    setCheckoutOpen(true);
  }, [creditAmount]);

  const handleCheckoutSuccess = useCallback(() => {
    setCheckoutOpen(false);
    setCheckoutItem(null);
    setCheckoutItemType(null);
    onClose();
  }, [onClose]);

  const oneTimePrice = (creditAmount * 0.012).toFixed(0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div 
        className={`absolute inset-0 bg-black/90 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      <div 
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div className="min-h-full flex items-start justify-center p-3 pt-8 pb-8">
          <div 
            className={`relative w-full max-w-md rounded-2xl transition-all duration-200 glass-panel-strong ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ 
              transform: isVisible ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Get Credits</h2>
                  <p className="text-xs text-slate-400">
                    {purchaseType === 'subscription' ? 'Monthly subscription' : 'One-time purchase'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-lg glass-card flex items-center justify-center"
                  data-testid="button-close-credits-modal"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex gap-1 p-1 glass-card rounded-lg mb-4">
                <button
                  onClick={() => setPurchaseType('subscription')}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all active:scale-[0.98] ${
                    purchaseType === 'subscription'
                      ? 'bg-white text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  data-testid="button-subscription-tab"
                >
                  Subscription
                  {purchaseType !== 'subscription' && (
                    <span className="ml-1.5 text-[9px] text-green-400 border border-green-400/40 rounded-full px-1.5 py-0.5">Best</span>
                  )}
                </button>
                <button
                  onClick={() => setPurchaseType('one-time')}
                  className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all active:scale-[0.98] ${
                    purchaseType === 'one-time'
                      ? 'bg-white text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  data-testid="button-onetime-tab"
                >
                  One-Time
                </button>
              </div>

              {purchaseType === 'subscription' && (
                <>
                  <div className="flex gap-1 p-1 glass-card rounded-lg mb-4">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all active:scale-[0.98] ${
                        billingCycle === 'monthly'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      data-testid="button-monthly-cycle"
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('annual')}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold transition-all active:scale-[0.98] relative ${
                        billingCycle === 'annual'
                          ? 'bg-white/10 text-white border border-white/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      data-testid="button-annual-cycle"
                    >
                      Annual
                      <span className="ml-1 text-[9px] text-green-400">-17%</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {SUBSCRIPTION_TIERS.map((tier) => (
                      <PricingCard
                        key={tier.id}
                        tier={tier}
                        billingCycle={billingCycle}
                        onPurchase={handlePurchase}
                        isLoading={loadingTier === tier.id}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col items-center gap-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Included free with subscription</p>
                    <div className="flex items-center gap-3 text-[10px] sm:text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" />Free Course</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" />Photo/Video Repurposer</span>
                      <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" />Viral Reel Finder</span>
                    </div>
                  </div>
                </>
              )}

              {purchaseType === 'one-time' && (
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Coins className="w-6 h-6 text-yellow-400" />
                    <input
                      type="number"
                      min="2000"
                      max="10000"
                      step="50"
                      value={creditAmount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) setCreditAmount(Math.min(10000, Math.max(2000, val)));
                      }}
                      onBlur={() => {
                        setCreditAmount(prev => Math.min(10000, Math.max(2000, Math.round(prev / 50) * 50)));
                      }}
                      className="text-4xl font-bold text-white bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none text-center w-36 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      data-testid="input-credits"
                    />
                  </div>

                  <div className="mb-4 px-1">
                    <input
                      type="range"
                      min="2000"
                      max="10000"
                      step="50"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer 
                        [&::-webkit-slider-thumb]:appearance-none 
                        [&::-webkit-slider-thumb]:w-5 
                        [&::-webkit-slider-thumb]:h-5 
                        [&::-webkit-slider-thumb]:rounded-full 
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                      data-testid="slider-credits"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>2000</span>
                      <span>10000</span>
                    </div>
                  </div>

                  <div className="text-center border-t border-white/10 pt-4 mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-white">${oneTimePrice}</span>
                      <span className="text-xs text-slate-400">one-time</span>
                    </div>
                    <p className="text-xs text-slate-300">$0.012 per credit</p>
                  </div>

                  <div className="glass-card border-amber-500/20 rounded-lg p-2.5 mb-4">
                    <p className="text-[11px] text-amber-300 text-center">
                      Subscriptions are cheaper at $0.008-0.010/credit
                    </p>
                  </div>

                  <button
                    onClick={handleOneTimePurchase}
                    disabled={loadingTier === 'onetime'}
                    className="w-full py-3 rounded-xl font-semibold text-sm btn-primary-glass transition-all active:scale-[0.98] disabled:opacity-50"
                    data-testid="button-buy-onetime"
                  >
                    {loadingTier === 'onetime' ? 'Loading...' : <span className="inline-flex items-center gap-1.5">Buy {creditAmount} <Coins className="w-4 h-4 text-yellow-400" /></span>}
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cancel anytime
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Secure checkout
                </span>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-4 py-2 text-slate-500 active:text-slate-300 text-xs transition-colors"
                data-testid="button-skip-credits"
              >
                Skip for now →
              </button>
            </div>
          </div>
        </div>
      </div>

      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setCheckoutItem(null);
          setCheckoutItemType(null);
        }}
        item={checkoutItem}
        itemType={checkoutItemType}
        onSuccess={handleCheckoutSuccess}
      />
    </div>
  );
}
