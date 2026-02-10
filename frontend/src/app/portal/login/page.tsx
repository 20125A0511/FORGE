"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, Phone, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import {
  requestPortalOTP,
  verifyPortalOTP,
  setPortalToken,
  isPortalAuthenticated,
} from "@/lib/api";

type Step = "contact" | "otp";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PortalLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("contact");
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState<"email" | "phone">("email");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpDev, setOtpDev] = useState<string | null>(null);

  useEffect(() => {
    if (isPortalAuthenticated()) {
      router.replace("/portal/chat");
    }
  }, [router]);

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const c = contact.trim();
    if (!c) {
      setError("Please enter your email or phone number.");
      return;
    }
    const type = EMAIL_REGEX.test(c) ? "email" : "phone";
    setContactType(type);
    setLoading(true);
    try {
      const res = await requestPortalOTP(c, type);
      setContact(c);
      if (res.otp_dev) setOtpDev(res.otp_dev);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyPortalOTP(contact.trim(), contactType, otp.trim());
      setPortalToken(res.access_token);
      router.replace("/portal/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg">
            <Image src="/logo.png" alt="FORGE" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">FORGE</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Customer Portal
            </p>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-1">
            {step === "contact" ? "Sign in" : "Enter verification code"}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {step === "contact"
              ? "Enter your email or phone to receive a one-time code."
              : `We sent a code to ${contact}. Enter it below.`}
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === "contact" ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Email or phone
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="you@example.com or +1 234 567 8900"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-sm font-medium text-white cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              {otpDev && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  Dev: Your code is <strong>{otpDev}</strong>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  6-digit code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center text-2xl tracking-[0.5em]"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-sm font-medium text-white cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Verify & sign in"
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("contact")}
                className="w-full text-sm text-slate-400 hover:text-slate-300 cursor-pointer"
              >
                Use a different email or phone
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          By continuing, you agree to receive a one-time code for authentication.
        </p>
      </div>
    </div>
  );
}
