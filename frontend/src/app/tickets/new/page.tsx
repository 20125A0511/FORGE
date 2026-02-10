"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Sparkles,
  Clock,
  Tag,
  Wrench,
  Shield,
  FileText,
  Plus,
} from "lucide-react";
import { createTicket, Ticket, severityColor, formatMinutes } from "@/lib/api";

const CATEGORIES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Telecommunications",
  "IT Services",
  "General Maintenance",
];

export default function NewTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    equipment_type: "",
    location_address: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const data: Record<string, string | undefined> = {
        title: form.title,
        description: form.description,
      };
      if (form.category) data.category = form.category;
      if (form.equipment_type) data.equipment_type = form.equipment_type;
      if (form.location_address) data.location_address = form.location_address;
      if (form.customer_name) data.customer_name = form.customer_name;
      if (form.customer_email) data.customer_email = form.customer_email;
      if (form.customer_phone) data.customer_phone = form.customer_phone;

      const ticket = await createTicket(data as any);
      setCreatedTicket(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  // Parse LLM analysis if available
  let analysis: any = null;
  if (createdTicket?.llm_analysis) {
    try {
      analysis =
        typeof createdTicket.llm_analysis === "string"
          ? JSON.parse(createdTicket.llm_analysis)
          : createdTicket.llm_analysis;
    } catch {
      // not JSON
    }
  }

  if (createdTicket) {
    return (
      <div>
        <button
          onClick={() => router.push("/tickets")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tickets
        </button>

        {/* Success Header */}
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Ticket Created Successfully
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                #{createdTicket.id} — {createdTicket.title}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${severityColor(
                  createdTicket.severity
                )}`}
              >
                {createdTicket.severity}
              </span>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {(analysis || createdTicket.confidence_score) && (
          <div className="glass rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">
                AI Analysis Results
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Confidence Score */}
              {createdTicket.confidence_score != null && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      Confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white tabular-nums">
                      {Math.round(createdTicket.confidence_score * 100)}%
                    </span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        style={{
                          width: `${createdTicket.confidence_score * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Time Estimate */}
              {createdTicket.time_estimate_minutes != null && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      Time Est.
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-white">
                    {formatMinutes(createdTicket.time_estimate_minutes)}
                  </span>
                </div>
              )}

              {/* Category */}
              {createdTicket.category && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      Category
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-white">
                    {createdTicket.category}
                  </span>
                </div>
              )}

              {/* Equipment */}
              {createdTicket.equipment_type && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-slate-400 uppercase tracking-wider">
                      Equipment
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-white">
                    {createdTicket.equipment_type}
                  </span>
                </div>
              )}
            </div>

            {/* Skills Required */}
            {createdTicket.skills_required &&
              createdTicket.skills_required.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">
                    Skills Required
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {createdTicket.skills_required.map((skill, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Troubleshooting Steps */}
            {analysis?.troubleshooting_steps &&
              analysis.troubleshooting_steps.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">
                    Troubleshooting Steps
                  </h3>
                  <div className="space-y-2">
                    {analysis.troubleshooting_steps.map(
                      (step: string, i: number) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-medium text-slate-400 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm text-slate-300">{step}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/tickets/${createdTicket.id}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            View Ticket Details
          </button>
          <button
            onClick={() => {
              setCreatedTicket(null);
              setForm({
                title: "",
                description: "",
                category: "",
                equipment_type: "",
                location_address: "",
                customer_name: "",
                customer_email: "",
                customer_phone: "",
              });
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-300 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/tickets")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </button>

      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-white mb-1">
          Submit Service Request
        </h1>
        <p className="text-slate-400 mb-8">
          Describe the issue and our AI will analyze it to determine severity,
          required skills, and time estimates.
        </p>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Brief description of the issue"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Provide detailed information about the problem, symptoms, and any relevant context..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">Select category (optional)</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment Type */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Equipment Type
              </label>
              <input
                type="text"
                name="equipment_type"
                value={form.equipment_type}
                onChange={handleChange}
                placeholder="e.g., Industrial HVAC Unit"
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Location Address
            </label>
            <input
              type="text"
              name="location_address"
              value={form.location_address}
              onChange={handleChange}
              placeholder="Service location address"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Customer Info */}
          <div className="border-t border-slate-700/50 pt-6">
            <h2 className="text-sm font-medium text-slate-300 mb-4">
              Customer Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={form.customer_name}
                  onChange={handleChange}
                  placeholder="Customer name"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={form.customer_email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={form.customer_phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.description.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white cursor-pointer shadow-lg shadow-blue-500/20"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing & Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push("/tickets")}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
