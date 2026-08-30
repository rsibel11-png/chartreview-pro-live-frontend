// PagePaymentDialog.tsx — chartreview-pro-live-frontend
// Updated: 2026-08-30 — Pricing updated to match InPractice AI competitor ($0.10–$0.05/page)
// Updated: 2026-08-22 — Port of PagePaymentDialog from Base44 app to CRA/TypeScript
// Uses awsProxy pattern (API Gateway + Cognito) instead of base44 SDK

import React, { useState, useEffect } from "react";
import { Loader2, CreditCard, FileText, CheckCircle, AlertCircle, Info } from "lucide-react";

// ── Env vars (CRA) ────────────────────────────────────────────────────────────
const AWS_API_URL = process.env.REACT_APP_AWS_API_URL || "";
const API_KEY = process.env.REACT_APP_AWS_API_KEY || "";
const ORG_ID = process.env.REACT_APP_ORG_ID || "";

// ── Tiered pricing (matches backend) ──────────────────────────────────────────
function getPricePerPage(pages: number): number {
  if (pages <= 1000) return 0.10;
  if (pages <= 5000) return 0.09;
  if (pages <= 20000) return 0.07;
  if (pages <= 100000) return 0.06;
  return 0.05;
}

function getTierLabel(pages: number): string {
  if (pages <= 1000) return "Starter (≤1,000 pages)";
  if (pages <= 5000) return "Pro (1,001–5,000 pages)";
  if (pages <= 20000) return "Growth (5,001–20,000 pages)";
  if (pages <= 100000) return "Scale (20,001–100,000 pages)";
  return "Enterprise (100,001+ pages)";
}

function getTierColor(pages: number): string {
  if (pages <= 1000) return "bg-slate-100 text-slate-700";
  if (pages <= 5000) return "bg-blue-100 text-blue-700";
  if (pages <= 20000) return "bg-cyan-100 text-cyan-700";
  if (pages <= 100000) return "bg-green-100 text-green-700";
  return "bg-emerald-100 text-emerald-700";
}

const BUNDLE_SIZES = [1000, 5000, 20000, 100000, 200000];

function getBundleOptions(neededPages: number): number[] {
  return BUNDLE_SIZES.filter(size => size > neededPages).slice(0, 4);
}

// ── API helper ────────────────────────────────────────────────────────────────
async function stripeApi(path: string, method: string = "GET", data?: any, idToken?: string): Promise<any> {
  const url = `${AWS_API_URL}${path}`;
  const opts: any = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "Authorization": `Bearer ${idToken || ""}`,
      "x-org-id": ORG_ID,
    },
  };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch(url, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `API error: ${res.status}`);
  return json;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface PagePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  estimatedPages: number;
  onProceed: (mode: string) => void;
  idToken: string;
  isFreeUser: boolean;
}

export default function PagePaymentDialog({
  open,
  onClose,
  estimatedPages,
  onProceed,
  idToken,
  isFreeUser,
}: PagePaymentDialogProps) {
  const [paymentMode, setPaymentMode] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [sessionPaid, setSessionPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<number | null>(null);
  const [credits, setCredits] = useState({
    page_credits: 0,
    free_pages_remaining: 0,
    is_admin: false,
  });
  const [creditsLoading, setCreditsLoading] = useState(false);

  const pages = estimatedPages || 0;
  const pricePerPage = getPricePerPage(pages);
  const totalCost = Math.round(pages * pricePerPage * 100);
  const totalCostDisplay = `$${(totalCost / 100).toFixed(2)}`;

  const bundleOptions = getBundleOptions(pages);
  const payPages = selectedBundle || pages;
  const payPricePerPage = getPricePerPage(payPages);
  const payCost = selectedBundle
    ? Math.round(selectedBundle * payPricePerPage * 100)
    : totalCost;
  const payCostDisplay = `$${(payCost / 100).toFixed(2)}`;

  const totalCredits = credits.page_credits + credits.free_pages_remaining;
  const hasEnoughCredits = isFreeUser || credits.is_admin || totalCredits >= pages;

  // Fetch user credits when dialog opens
  useEffect(() => {
    if (!open || isFreeUser) return;
    setCreditsLoading(true);
    stripeApi("/stripe/credits", "GET", undefined, idToken)
      .then((data: any) => {
        setCredits({
          page_credits: data.page_credits || 0,
          free_pages_remaining: data.free_pages_remaining || 0,
          is_admin: data.is_admin || false,
        });
      })
      .catch((err: any) => console.error("Failed to fetch credits:", err))
      .finally(() => setCreditsLoading(false));
  }, [open, isFreeUser, idToken]);

  // Check if returning from a Stripe payment
  useEffect(() => {
    if (!open) return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("upload_session_id");
    if (sessionId) {
      setCheckingPayment(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      // Refetch credits
      stripeApi("/stripe/credits", "GET", undefined, idToken)
        .then((data: any) => {
          setCredits({
            page_credits: data.page_credits || 0,
            free_pages_remaining: data.free_pages_remaining || 0,
            is_admin: data.is_admin || false,
          });
          setCheckingPayment(false);
          setSessionPaid(true);
          setPaymentMode("stripe_done");
        })
        .catch(() => setCheckingPayment(false));
    }
  }, [open, idToken]);

  const handleUseCredits = () => {
    setPaymentMode("credits");
    onProceed("credits");
  };

  const handleStripeCheckout = async () => {
    setStripeLoading(true);
    try {
      const response = await stripeApi("/stripe/checkout", "POST", {
        pages: payPages,
        amountCents: payCost,
        returnPath: window.location.pathname + "?upload_session_id=pending",
      }, idToken);
      window.location.href = response.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert("Failed to start checkout. Please try again.");
      setStripeLoading(false);
    }
  };

  if (!open) return null;

  if (checkingPayment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-700 font-medium">Verifying payment…</p>
        </div>
      </div>
    );
  }

  if (sessionPaid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
          <h3 className="text-xl font-bold text-slate-900">Payment Confirmed!</h3>
          <p className="text-slate-600">Your credits have been added. Click below to proceed with your upload.</p>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg h-12 text-base transition-colors"
            onClick={() => onProceed("stripe_paid")}
          >
            Start Upload
          </button>
        </div>
      </div>
    );
  }

  // Free user / admin — skip payment, show simple confirmation
  if (isFreeUser || credits.is_admin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-xl font-bold text-slate-900">Upload Summary</h3>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Pages to process</span>
              <span className="text-2xl font-bold text-slate-900">{pages.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Estimated cost</span>
              <span className="text-sm font-medium text-green-600">Admin — no charge</span>
            </div>
          </div>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg h-12 text-base transition-colors flex items-center justify-center gap-2"
            onClick={handleUseCredits}
          >
            <CheckCircle className="w-5 h-5" />
            Proceed with Upload
          </button>
          <button
            className="w-full text-slate-500 hover:text-slate-700 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Full payment dialog for paying users
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-slate-900">Upload Payment Required</h3>
            </div>
            <p className="text-sm text-slate-600">
              Review the page count and cost before processing your documents.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Pages to process</span>
              <span className="text-2xl font-bold text-slate-900">{pages.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Pricing tier</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTierColor(pages)}`}>
                {getTierLabel(pages)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Rate</span>
              <span className="font-semibold text-slate-800">${pricePerPage.toFixed(2)} / page</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-slate-900 font-bold text-lg">Total</span>
              <span className="text-2xl font-bold text-blue-700">{totalCostDisplay}</span>
            </div>
          </div>

          {/* Current Credits */}
          {creditsLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading credit balance…
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Your Available Credits</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <div className="font-bold text-green-700">{credits.free_pages_remaining}</div>
                  <div className="text-slate-500 text-xs">Free Monthly</div>
                </div>
                <div>
                  <div className="font-bold text-cyan-700">{credits.page_credits}</div>
                  <div className="text-slate-500 text-xs">Purchased</div>
                </div>
                <div>
                  <div className={`font-bold text-lg ${hasEnoughCredits ? "text-green-700" : "text-red-600"}`}>
                    {totalCredits}
                  </div>
                  <div className="text-slate-500 text-xs">Total Available</div>
                </div>
              </div>
            </div>
          )}

          {hasEnoughCredits && !creditsLoading && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <p className="text-sm text-green-800">
                You have enough credits to cover this upload. {pages} credits will be deducted from your account.
              </p>
            </div>
          )}

          {!hasEnoughCredits && !creditsLoading && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                You need {pages - totalCredits} more credits. Pay with card to add exactly the right amount.
              </p>
            </div>
          )}

          {/* Bundle Options */}
          {bundleOptions.length > 0 && !creditsLoading && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Buy a larger bundle & save:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedBundle(null)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    selectedBundle === null
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  }`}
                >
                  <div className="font-semibold text-slate-900 text-sm">{pages.toLocaleString()} pages</div>
                  <div className="text-xs text-slate-500">Exact amount</div>
                  <div className="text-sm font-bold text-blue-700 mt-1">{totalCostDisplay}</div>
                </button>
                {bundleOptions.map((size: number) => {
                  const rate = getPricePerPage(size);
                  const cost = Math.round(size * rate * 100);
                  const savings = (pricePerPage - rate).toFixed(2);
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedBundle(size)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        selectedBundle === size
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="font-semibold text-slate-900 text-sm">{size.toLocaleString()} pages</div>
                      <div className="text-xs text-green-600 font-medium">
                        {parseFloat(savings) > 0 ? `Save $${savings}/pg` : "Best value"}
                      </div>
                      <div className="text-sm font-bold text-blue-700 mt-1">${(cost / 100).toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {hasEnoughCredits && !creditsLoading && (
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg h-12 text-base transition-colors flex items-center justify-center gap-2"
                onClick={handleUseCredits}
              >
                <CheckCircle className="w-5 h-5" />
                Use My Credits & Start Upload
              </button>
            )}

            <button
              className={`w-full h-12 text-base font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                hasEnoughCredits
                  ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              onClick={handleStripeCheckout}
              disabled={stripeLoading}
            >
              {stripeLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to payment…</>
              ) : (
                <><CreditCard className="w-5 h-5" /> Pay {payCostDisplay}{selectedBundle ? ` for ${selectedBundle.toLocaleString()} pages` : ""} with Card</>
              )}
            </button>

            <button
              className="w-full text-slate-500 hover:text-slate-700 text-sm"
              onClick={onClose}
            >
              Cancel Upload
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            * Page count is an estimate based on document analysis. Final deduction matches actual pages processed.
          </p>
        </div>
      </div>
    </div>
  );
}
