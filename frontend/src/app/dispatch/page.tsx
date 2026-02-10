"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Zap,
  AlertTriangle,
  Clock,
  User,
  RefreshCw,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowRight,
  MapPin,
  Play,
  Navigation,
  X,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  getTickets,
  getAssignments,
  autoAssignTicket,
  updateAssignment,
  Ticket,
  Assignment,
  severityColor,
  severityDot,
  statusColor,
  timeAgo,
  formatMinutes,
} from "@/lib/api";

export default function DispatchPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningTicketId, setAssigningTicketId] = useState<number | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [ticketData, assignmentData] = await Promise.all([
        getTickets({ page_size: 100 }),
        getAssignments(),
      ]);

      setTickets(ticketData.tickets || []);
      setAssignments(assignmentData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAutoAssign = async (ticketId: number) => {
    try {
      setAssigningTicketId(ticketId);
      await autoAssignTicket(ticketId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-assign failed");
    } finally {
      setAssigningTicketId(null);
    }
  };

  const handleUpdateAssignment = async (assignmentId: number, newStatus: string) => {
    try {
      await updateAssignment(assignmentId, { status: newStatus } as any);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  // Categorize tickets
  const severityCounts = {
    P1: tickets.filter((t) => t.severity === "P1").length,
    P2: tickets.filter((t) => t.severity === "P2").length,
    P3: tickets.filter((t) => t.severity === "P3").length,
    P4: tickets.filter((t) => t.severity === "P4").length,
  };

  const unassignedTickets = tickets
    .filter(
      (t) =>
        !t.assigned_worker_id &&
        !["completed", "cancelled"].includes(t.status)
    )
    .sort((a, b) => {
      const sev: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
      const sevDiff = (sev[a.severity] ?? 4) - (sev[b.severity] ?? 4);
      if (sevDiff !== 0) return sevDiff;
      if (a.sla_deadline && b.sla_deadline) {
        return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const activeAssignments = assignments.filter(
    (a) => !["completed", "cancelled"].includes(a.status)
  );

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-72 mb-8" />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-96 rounded-xl" />
          <div className="skeleton h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Radio className="w-6 h-6 text-blue-400" />
            Dispatch Center
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time assignment and resource management
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {!refreshing && "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <p className="text-sm text-rose-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto cursor-pointer">
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Severity Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "P1 Critical", key: "P1" as const, color: "text-rose-400", borderColor: "border-rose-500/30", bgColor: "bg-rose-500/5", dot: "bg-rose-500", pulse: true },
          { label: "P2 High", key: "P2" as const, color: "text-amber-400", borderColor: "border-amber-500/30", bgColor: "bg-amber-500/5", dot: "bg-amber-500", pulse: false },
          { label: "P3 Medium", key: "P3" as const, color: "text-blue-400", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/5", dot: "bg-blue-500", pulse: false },
          { label: "P4 Low", key: "P4" as const, color: "text-slate-400", borderColor: "border-slate-500/30", bgColor: "bg-slate-500/5", dot: "bg-slate-500", pulse: false },
        ].map((item) => (
          <div
            key={item.key}
            className={`glass rounded-xl p-4 ${item.borderColor} ${item.bgColor} ${
              item.pulse && severityCounts[item.key] > 0
                ? "pulse-critical"
                : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
              <span className="text-xs font-medium text-slate-400">
                {item.label}
              </span>
            </div>
            <span className={`text-3xl font-bold ${item.color} tabular-nums`}>
              {severityCounts[item.key]}
            </span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Assignments */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Active Assignments
              <span className="text-sm font-normal text-slate-500">
                ({activeAssignments.length})
              </span>
            </h2>
          </div>

          {activeAssignments.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {activeAssignments.map((assignment) => {
                const ticket = tickets.find(
                  (t) => t.id === assignment.ticket_id
                );
                return (
                  <div
                    key={assignment.id}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ticket && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityColor(
                                ticket.severity
                              )}`}
                            >
                              {ticket.severity}
                            </span>
                          )}
                          <h4
                            className="text-sm font-medium text-white truncate cursor-pointer hover:text-blue-400"
                            onClick={() =>
                              router.push(`/tickets/${assignment.ticket_id}`)
                            }
                          >
                            {assignment.ticket_title ||
                              ticket?.title ||
                              `Ticket #${assignment.ticket_id}`}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {assignment.worker_name ||
                              `Worker #${assignment.worker_id}`}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusColor(
                              assignment.status
                            )}`}
                          >
                            {assignment.status.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ETA */}
                    {assignment.eta && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                        <Clock className="w-3 h-3" />
                        ETA: {new Date(assignment.eta).toLocaleTimeString()}
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full ${
                          assignment.status === "completed"
                            ? "bg-emerald-500 w-full"
                            : assignment.status === "in_progress"
                              ? "bg-yellow-500 w-3/4"
                              : assignment.status === "en_route"
                                ? "bg-orange-500 w-1/2"
                                : "bg-blue-500 w-1/4"
                        }`}
                      />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      {(assignment.status === "pending" || assignment.status === "accepted") && (
                        <button
                          onClick={() =>
                            handleUpdateAssignment(assignment.id, "en_route")
                          }
                          className="flex items-center gap-1 px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-md text-[11px] font-medium text-orange-300 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          En Route
                        </button>
                      )}
                      {(assignment.status === "pending" ||
                        assignment.status === "accepted" ||
                        assignment.status === "en_route") && (
                        <button
                          onClick={() =>
                            handleUpdateAssignment(
                              assignment.id,
                              "in_progress"
                            )
                          }
                          className="flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-md text-[11px] font-medium text-yellow-300 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                      {assignment.status === "in_progress" && (
                        <button
                          onClick={() =>
                            handleUpdateAssignment(assignment.id, "completed")
                          }
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md text-[11px] font-medium text-emerald-300 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">No active assignments</p>
            </div>
          )}
        </div>

        {/* Unassigned Tickets */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Unassigned Tickets
              <span className="text-sm font-normal text-slate-500">
                ({unassignedTickets.length})
              </span>
            </h2>
          </div>

          {unassignedTickets.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {unassignedTickets.map((ticket) => {
                const slaDeadline = ticket.sla_deadline
                  ? new Date(ticket.sla_deadline)
                  : null;
                const slaRemaining = slaDeadline
                  ? slaDeadline.getTime() - Date.now()
                  : null;
                const slaUrgent =
                  slaRemaining != null && slaRemaining < 3600000;
                const slaOverdue = slaRemaining != null && slaRemaining < 0;

                return (
                  <div
                    key={ticket.id}
                    className={`bg-slate-800/50 rounded-lg p-4 border ${
                      ticket.severity === "P1"
                        ? "border-rose-500/30"
                        : slaOverdue
                          ? "border-rose-500/20"
                          : "border-slate-700/50"
                    } hover:border-slate-600/50`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityColor(
                              ticket.severity
                            )} ${
                              ticket.severity === "P1" ? "pulse-critical" : ""
                            }`}
                          >
                            {ticket.severity}
                          </span>
                          <h4
                            className="text-sm font-medium text-white truncate cursor-pointer hover:text-blue-400"
                            onClick={() =>
                              router.push(`/tickets/${ticket.id}`)
                            }
                          >
                            {ticket.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {ticket.category && (
                            <span>{ticket.category}</span>
                          )}
                          <span>{timeAgo(ticket.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SLA Warning */}
                    {slaDeadline && (
                      <div
                        className={`flex items-center gap-1 text-xs mb-3 ${
                          slaOverdue
                            ? "text-rose-400"
                            : slaUrgent
                              ? "text-amber-400"
                              : "text-slate-500"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {slaOverdue
                          ? `SLA overdue by ${formatMinutes(
                              Math.abs(slaRemaining!) / 60000
                            )}`
                          : `SLA: ${formatMinutes(slaRemaining! / 60000)} remaining`}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAutoAssign(ticket.id)}
                        disabled={assigningTicketId === ticket.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-300 cursor-pointer disabled:opacity-50"
                      >
                        {assigningTicketId === ticket.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Auto-Assign
                      </button>
                      <button
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs text-slate-400 cursor-pointer"
                      >
                        Details
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TicketIcon className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">
                All tickets are assigned
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
