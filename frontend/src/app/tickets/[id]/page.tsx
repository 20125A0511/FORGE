"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  Shield,
  Clock,
  Tag,
  Wrench,
  User,
  Mail,
  Phone,
  MapPin,
  Zap,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Star,
  Navigation,
  Timer,
  Award,
  X,
  Target,
} from "lucide-react";
import {
  getTicket,
  getTicketCandidates,
  autoAssignTicket,
  analyzeTicket,
  updateTicket,
  Ticket,
  WorkerCandidate,
  severityColor,
  statusColor,
  formatMinutes,
  timeAgo,
} from "@/lib/api";

const STATUS_FLOW = [
  "new",
  "analyzing",
  "open",
  "assigned",
  "en_route",
  "in_progress",
  "completed",
];

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);
  return (
    <div className="space-y-1">
      {STATUS_FLOW.map((status, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <div key={status} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 ${
                  isCompleted
                    ? "bg-emerald-500 border-emerald-500"
                    : isCurrent
                      ? "bg-blue-500 border-blue-500"
                      : "bg-transparent border-slate-600"
                }`}
              />
              {idx < STATUS_FLOW.length - 1 && (
                <div
                  className={`w-0.5 h-6 ${
                    isCompleted ? "bg-emerald-500/50" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
            <span
              className={`text-sm ${
                isCurrent
                  ? "text-blue-400 font-medium"
                  : isCompleted
                    ? "text-emerald-400"
                    : "text-slate-600"
              }`}
            >
              {status.replace(/_/g, " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CandidateCard({
  candidate,
  onAssign,
  assigning,
}: {
  candidate: WorkerCandidate;
  onAssign: (workerId: number) => void;
  assigning: boolean;
}) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
            {candidate.worker_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">
              {candidate.worker_name}
            </h4>
            <p className="text-xs text-slate-500">ID #{candidate.worker_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-blue-400 tabular-nums">
            {Math.round(candidate.overall_score * 100)}%
          </span>
          <button
            onClick={() => onAssign(candidate.worker_id)}
            disabled={assigning}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-xs font-medium text-white cursor-pointer"
          >
            Assign
          </button>
        </div>
      </div>

      {/* Score Bars */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Skill Match", score: candidate.skill_match_score, color: "bg-blue-500" },
          { label: "Proximity", score: candidate.proximity_score, color: "bg-emerald-500" },
          { label: "Availability", score: candidate.availability_score, color: "bg-amber-500" },
          { label: "Performance", score: candidate.performance_score, color: "bg-violet-500" },
        ].map(({ label, score, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{label}</span>
              <span className="text-xs text-slate-400 tabular-nums">
                {Math.round(score * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${score * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Travel Info */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Navigation className="w-3 h-3" />
          {candidate.travel_distance_km.toFixed(1)} km
        </span>
        <span className="flex items-center gap-1">
          <Timer className="w-3 h-3" />
          {Math.round(candidate.travel_time_minutes)} min travel
        </span>
      </div>

      {/* Skills */}
      {candidate.matching_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {candidate.matching_skills.map((skill, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            >
              {skill}
            </span>
          ))}
          {candidate.missing_skills.map((skill, i) => (
            <span
              key={`m-${i}`}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 line-through"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<WorkerCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [autoAssigning, setAutoAssigning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [manualAssigning, setManualAssigning] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTicket(ticketId);
      setTicket(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      await autoAssignTicket(ticketId);
      await fetchTicket();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Auto-assign failed"
      );
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      await analyzeTicket(ticketId);
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewCandidates = async () => {
    try {
      setLoadingCandidates(true);
      setShowCandidates(true);
      const data = await getTicketCandidates(ticketId);
      setCandidates(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load candidates"
      );
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleManualAssign = async (workerId: number) => {
    try {
      setManualAssigning(true);
      const { createAssignment } = await import("@/lib/api");
      await createAssignment({ ticket_id: ticketId, worker_id: workerId });
      setShowCandidates(false);
      await fetchTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setManualAssigning(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateTicket(ticketId, { status: newStatus } as any);
      await fetchTicket();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status update failed"
      );
    }
  };

  // Parse LLM analysis
  let analysis: any = null;
  if (ticket?.llm_analysis) {
    try {
      analysis =
        typeof ticket.llm_analysis === "string"
          ? JSON.parse(ticket.llm_analysis)
          : ticket.llm_analysis;
    } catch {
      // plain text
    }
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton h-4 w-32 mb-6" />
        <div className="skeleton h-8 w-96 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl p-6">
              <div className="skeleton h-4 w-24 mb-4" />
              <div className="skeleton h-20 w-full" />
            </div>
            <div className="glass rounded-xl p-6">
              <div className="skeleton h-4 w-32 mb-4" />
              <div className="skeleton h-40 w-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-xl p-6">
              <div className="skeleton h-4 w-20 mb-4" />
              <div className="skeleton h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <h2 className="text-xl font-semibold text-white">Error Loading Ticket</h2>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={fetchTicket}
          className="px-4 py-2 bg-blue-500 rounded-lg text-sm text-white cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  const slaDeadline = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null;
  const slaRemaining = slaDeadline
    ? slaDeadline.getTime() - Date.now()
    : null;
  const slaOverdue = slaRemaining != null && slaRemaining < 0;

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => router.push("/tickets")}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </button>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm text-slate-500 tabular-nums">
              #{ticket.id}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border ${severityColor(
                ticket.severity
              )} ${ticket.severity === "P1" ? "pulse-critical" : ""}`}
            >
              {ticket.severity}
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border ${statusColor(
                ticket.status
              )}`}
            >
              {ticket.status.replace(/_/g, " ")}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">{ticket.title}</h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!ticket.assigned_worker_id && (
            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 rounded-lg text-sm font-medium text-white cursor-pointer"
            >
              {autoAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Auto-Assign
            </button>
          )}
          <button
            onClick={handleViewCandidates}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-300 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            View Candidates
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 rounded-lg text-sm font-medium text-slate-300 cursor-pointer"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Re-analyze
          </button>
        </div>
      </div>

      {/* Candidates Panel */}
      {showCandidates && (
        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              Ranked Worker Candidates
            </h2>
            <button
              onClick={() => setShowCandidates(false)}
              className="text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {loadingCandidates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-40 rounded-lg" />
              ))}
            </div>
          ) : candidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((c) => (
                <CandidateCard
                  key={c.worker_id}
                  candidate={c}
                  onAssign={handleManualAssign}
                  assigning={manualAssigning}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">
              No matching candidates found
            </p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              Description
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {/* LLM Analysis */}
          {(analysis || ticket.confidence_score) && (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  AI Analysis
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {ticket.confidence_score != null && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[11px] text-slate-500 uppercase">
                        Confidence
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white tabular-nums">
                      {Math.round(ticket.confidence_score * 100)}%
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${ticket.confidence_score * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                {ticket.time_estimate_minutes != null && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] text-slate-500 uppercase">
                        Time Est.
                      </span>
                    </div>
                    <div className="text-xl font-bold text-white">
                      {formatMinutes(ticket.time_estimate_minutes)}
                    </div>
                  </div>
                )}
                {ticket.category && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] text-slate-500 uppercase">
                        Category
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {ticket.category}
                    </div>
                  </div>
                )}
                {ticket.equipment_type && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wrench className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-[11px] text-slate-500 uppercase">
                        Equipment
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {ticket.equipment_type}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {ticket.skills_required && ticket.skills_required.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.skills_required.map((skill, i) => (
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
                  <div className="mb-5">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                      Troubleshooting Steps
                    </h3>
                    <div className="space-y-2">
                      {analysis.troubleshooting_steps.map(
                        (step: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 bg-slate-800/30 rounded-lg p-3"
                          >
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="text-sm text-slate-300">{step}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Root Cause */}
              {analysis?.root_cause_analysis && (
                <div className="mb-5">
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Root Cause Analysis
                  </h3>
                  <p className="text-sm text-slate-300">
                    {analysis.root_cause_analysis}
                  </p>
                </div>
              )}

              {/* Safety Considerations */}
              {analysis?.safety_considerations &&
                analysis.safety_considerations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                      Safety Considerations
                    </h3>
                    <div className="space-y-1">
                      {analysis.safety_considerations.map(
                        (item: string, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm text-amber-300"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
              Status
            </h2>
            <StatusTimeline currentStatus={ticket.status} />

            {/* Quick Status Actions */}
            {ticket.status !== "completed" && ticket.status !== "cancelled" && (
              <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
                {ticket.status === "assigned" && (
                  <button
                    onClick={() => handleStatusUpdate("en_route")}
                    className="w-full px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-xs font-medium text-orange-300 cursor-pointer"
                  >
                    Mark En Route
                  </button>
                )}
                {(ticket.status === "en_route" ||
                  ticket.status === "assigned") && (
                  <button
                    onClick={() => handleStatusUpdate("in_progress")}
                    className="w-full px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg text-xs font-medium text-yellow-300 cursor-pointer"
                  >
                    Mark In Progress
                  </button>
                )}
                {ticket.status === "in_progress" && (
                  <button
                    onClick={() => handleStatusUpdate("completed")}
                    className="w-full px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-300 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                    Mark Completed
                  </button>
                )}
                <button
                  onClick={() => handleStatusUpdate("cancelled")}
                  className="w-full px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-xs font-medium text-slate-500 cursor-pointer"
                >
                  Cancel Ticket
                </button>
              </div>
            )}
          </div>

          {/* Assignment Info */}
          {ticket.assigned_worker_id && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                Assigned Worker
              </h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Worker #{ticket.assigned_worker_id}
                  </p>
                  <p className="text-xs text-slate-500">
                    Assigned {timeAgo(ticket.updated_at)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLA */}
          {slaDeadline && (
            <div
              className={`glass rounded-xl p-6 ${
                slaOverdue ? "border-rose-500/30" : ""
              }`}
            >
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                SLA Deadline
              </h2>
              <p
                className={`text-lg font-semibold ${
                  slaOverdue ? "text-rose-400" : "text-white"
                }`}
              >
                {slaDeadline.toLocaleString()}
              </p>
              {slaRemaining != null && (
                <p
                  className={`text-sm mt-1 ${
                    slaOverdue
                      ? "text-rose-400"
                      : slaRemaining < 3600000
                        ? "text-amber-400"
                        : "text-slate-500"
                  }`}
                >
                  {slaOverdue
                    ? `Overdue by ${formatMinutes(
                        Math.abs(slaRemaining) / 60000
                      )}`
                    : `${formatMinutes(slaRemaining / 60000)} remaining`}
                </p>
              )}
            </div>
          )}

          {/* Customer Info */}
          {(ticket.customer_name ||
            ticket.customer_email ||
            ticket.customer_phone) && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                Customer
              </h2>
              <div className="space-y-2">
                {ticket.customer_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      {ticket.customer_name}
                    </span>
                  </div>
                )}
                {ticket.customer_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      {ticket.customer_email}
                    </span>
                  </div>
                )}
                {ticket.customer_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">
                      {ticket.customer_phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location */}
          {ticket.location_address && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
                Location
              </h2>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                <span className="text-slate-300">
                  {ticket.location_address}
                </span>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
              Timeline
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-300">
                  {timeAgo(ticket.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Updated</span>
                <span className="text-slate-300">
                  {timeAgo(ticket.updated_at)}
                </span>
              </div>
              {ticket.completed_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed</span>
                  <span className="text-emerald-400">
                    {timeAgo(ticket.completed_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
