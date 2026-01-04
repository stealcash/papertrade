'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { subscriptionsAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function SubscriptionPage() {

  const router = useRouter();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, plan: any | null, isDowngrade?: boolean }>({ isOpen: false, plan: null });
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
    fetchPlans();
    fetchCurrentSubscription();
  }, [isAuthenticated, router]);

  const fetchCurrentSubscription = async () => {
    try {
      const res = await subscriptionsAPI.getCurrent();
      setCurrentSubscription(res.data.data);
    } catch (err) {
      console.error("Failed to fetch subscription", err);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await subscriptionsAPI.getPlans();
      setPlans(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan: any) => {
    // Reset coupon
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');

    let isDowngrade = false;
    if (currentSubscription && currentSubscription.plan) {
      const currentPriority = currentSubscription.plan.priority || 0;
      const newPriority = plan.priority || 0;

      if (currentSubscription.status === 'active' && currentPriority > newPriority) {
        isDowngrade = true;
      }
    }
    setConfirmModal({ isOpen: true, plan, isDowngrade });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !confirmModal.plan) return;
    setValidatingCoupon(true);
    setCouponError('');
    try {
      const res = await subscriptionsAPI.validateCoupon({
        code: couponCode,
        plan_id: confirmModal.plan.id,
        period: billingPeriod
      });
      setAppliedCoupon(res.data.data);
      toast.success("Coupon applied!");
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.message || "Invalid coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const confirmSubscribe = async () => {
    if (processing || !confirmModal.plan) return;

    try {
      setProcessing(true);
      await subscriptionsAPI.subscribe({
        plan_id: confirmModal.plan.id,
        period: billingPeriod,
        coupon_code: appliedCoupon ? appliedCoupon.code : undefined
      });
      toast.success("Subscribed successfully!");
      router.push('/profile');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Subscription failed");
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading plans...</div>;

  return (
    <div className="max-w-6xl space-y-10 mx-auto p-6">

      {/* ---------- Page Title ---------- */}
      <header className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Subscription Plans</h1>
        <p className="text-gray-500 mt-2">Choose a plan that fits your usage & growth</p>

        {/* Toggle */}
        <div className="flex justify-center mt-6">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${billingPeriod === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${billingPeriod === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Yearly
            </button>
          </div>
        </div>
      </header>

      {/* ---------- Pricing Cards ---------- */}
      <div className="grid gap-8 md:grid-cols-3">

        {plans.map(p => {
          // Check availability
          const availability = p.available_period || 'both'; // default to both for backward compatibility
          if (billingPeriod === 'monthly' && availability === 'yearly') return null;
          if (billingPeriod === 'yearly' && availability === 'monthly') return null;

          const price = billingPeriod === 'monthly' ? p.monthly_price : p.yearly_price;
          if (price === null) return null;

          // Determine current subscription period (Monthly vs Yearly)
          let isCurrentPeriodMatch = false;
          if (currentSubscription) {
            const start = new Date(currentSubscription.start_date);
            const end = new Date(currentSubscription.end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const subPeriod = diffDays > 40 ? 'yearly' : 'monthly';
            isCurrentPeriodMatch = subPeriod === billingPeriod;
          }

          const isActivePlan = currentSubscription?.plan?.id === p.id && currentSubscription?.status === 'active' && isCurrentPeriodMatch;

          return (
            <div
              key={p.id}
              className={`rounded-xl border p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between relative overflow-hidden
                        ${isActivePlan
                  ? 'border-green-500 ring-2 ring-green-500 bg-green-50/10 dark:bg-green-900/10'
                  : (p.is_default ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10' : 'border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700')
                }
                    `}
            >
              {isActivePlan && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                  CURRENTLY ACTIVE
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {p.name}
                </h2>
                {p.is_default && !isActivePlan && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full mt-2 inline-block font-medium">Popular / Default</span>}

                {p.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 min-h-[40px]">{p.description}</p>
                )}

                <div className="mt-4 mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">₹{price}</span>
                    <span className="text-gray-500 ml-1 text-lg">/ {billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What's included</h4>
                  <ul className="space-y-3">
                    {Object.entries(p.features || {}).map(([key, config]: any) => {
                      if (!config.enabled) return null;


                      // Friendly Labels
                      const LABELS: any = {
                        'STRATEGY_CREATE': 'Strategy Creation',
                        'BACKTEST_RUN': 'Backtest Runs',
                        'TRADE_EXECUTE': 'Live Trades'
                      };

                      const label = LABELS[key] || key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());

                      return (
                        <li key={key} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                          <span className="mr-2 text-green-500">✓</span>
                          <span>
                            {label}
                            {config.limit > 0 && ` (Limit: ${config.limit})`}
                            {config.limit === -1 && ` (Unlimited)`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => !isActivePlan && handleSubscribe(p)}
                disabled={processing || isActivePlan}
                className={`mt-8 w-full py-3 font-semibold rounded-lg transition disabled:opacity-80 disabled:cursor-not-allowed
                    ${isActivePlan
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200'
                  }
                `}
              >
                {isActivePlan ? 'Current Plan' : (processing ? 'Processing...' : 'Subscribe')}
              </button>
            </div>
          );
        })}

      </div>

      {/* ---------- Confirmation Modal ---------- */}
      {confirmModal.isOpen && confirmModal.plan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <header>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Subscription</h3>
            </header>

            <div className="py-2">
              <p className="text-gray-600 dark:text-gray-300">
                You are about to subscribe to the <strong>{confirmModal.plan.name}</strong> plan.
              </p>

              <div className="mt-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Plan Price ({billingPeriod})</span>
                  <span>₹{billingPeriod === 'monthly' ? confirmModal.plan.monthly_price : confirmModal.plan.yearly_price}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400 font-medium">
                    <span>Discount ({appliedCoupon.discount_percent}%)</span>
                    <span>- ₹{((billingPeriod === 'monthly' ? confirmModal.plan.monthly_price : confirmModal.plan.yearly_price) * appliedCoupon.discount_percent / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t dark:border-gray-700 pt-2 flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">Total Detail</span>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-gray-900 dark:text-white">
                      ₹
                      {(() => {
                        const original = billingPeriod === 'monthly' ? confirmModal.plan.monthly_price : confirmModal.plan.yearly_price;
                        if (!appliedCoupon) return original;
                        const final = original - (original * appliedCoupon.discount_percent / 100);
                        return Math.max(0, final).toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Coupon Input */}
              <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Have a coupon?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    disabled={!!appliedCoupon}
                    className="flex-1 px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white uppercase"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md font-medium"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode}
                      className="px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-md hover:bg-black dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </button>
                  )}
                </div>
                {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                {appliedCoupon && <p className="text-xs text-green-600">Coupon applied successfully!</p>}
              </div>

              {confirmModal.isDowngrade && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm rounded-lg border border-amber-200 dark:border-amber-700 flex gap-2">
                  <span className="text-lg">⚠️</span>
                  <p>
                    <strong>Warning:</strong> You are downgrading your current plan. You may lose access to advanced strategies and higher limits immediately/at cycle end.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setConfirmModal({ isOpen: false, plan: null })}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubscribe}
                disabled={processing || (() => {
                  const original = billingPeriod === 'monthly' ? confirmModal.plan.monthly_price : confirmModal.plan.yearly_price;
                  const final = appliedCoupon ? original - (original * appliedCoupon.discount_percent / 100) : original;
                  return final > 0;
                })()}
                className="px-6 py-2 bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-lg font-medium transition disabled:brightness-75 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : (
                  (() => {
                    const original = billingPeriod === 'monthly' ? confirmModal.plan.monthly_price : confirmModal.plan.yearly_price;
                    const final = appliedCoupon ? original - (original * appliedCoupon.discount_percent / 100) : original;
                    if (final > 0) return 'Payment Gateway Unavailable';
                    return 'Proceed';
                  })()
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
