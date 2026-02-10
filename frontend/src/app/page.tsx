"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Ticket,
  Users,
  Shield,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  getDashboardStats,
  DashboardStats,
  severityColor,
  statusColor,
  timeAgo,
  formatMinutes,
} from "@/lib/api";

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-10 rounded-lg" />
      </div>
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-3 w-32" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="glass rounded-xl p-6">
      <div className="skeleton h-6 w-40 mb-6" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 py-3">
          <div className="skeleton h-4 w-12" />
          <div className="skeleton h-4 w-48" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: string;
}) {
  return (
    <div className="glass rounded-xl p-6 glass-hover cursor-default group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconColor}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-white tabular-nums">
          {value}
        </span>
        {trend && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 mb-1">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function SeverityBar({
  label,
  count,
  max,
  color,
  dotColor,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  dotColor: string;
}) {
  const width = max > 0 ? Math.max((count / max) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-28 flex-shrink-0">
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex-1 h-7 bg-slate-800/50 rounded-md overflow-hidden relative">
        <div
          className={`h-full rounded-md ${color} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-300 w-10 text-right tabular-nums">
        {count}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      const data = await getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SkeletonTable />
          <SkeletonTable />
        </div>
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-rose-500/10">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          Unable to Load Dashboard
        </h2>
        <p className="text-slate-400 text-center max-w-md">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats();
          }}
          className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const severityMax = Math.max(
    ...Object.values(stats.tickets_by_severity || {}),
    1
  );
  const statusMax = Math.max(
    ...Object.values(stats.tickets_by_status || {}),
    1
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Real-time operations overview</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer ${
            refreshing ? "animate-spin" : ""
          }`}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {!refreshing && "Refresh"}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Tickets"
          value={stats.total_tickets}
          subtitle={`${stats.open_tickets} open tickets`}
          icon={Ticket}
          iconColor="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Active Workers"
          value={stats.active_workers}
          subtitle={`${stats.active_workers} of ${stats.total_workers} online`}
          icon={Users}
          iconColor="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          title="SLA Compliance"
          value={`${Math.round(stats.sla_compliance_rate || 0)}%`}
          subtitle={
            (stats.sla_compliance_rate || 0) >= 90
              ? "On target"
              : "Needs attention"
          }
          icon={Shield}
          iconColor={
            (stats.sla_compliance_rate || 0) >= 90
              ? "bg-emerald-500/10 text-emerald-400"
              : (stats.sla_compliance_rate || 0) >= 80
                ? "bg-amber-500/10 text-amber-400"
                : "bg-rose-500/10 text-rose-400"
          }
        />
        <StatCard
          title="Avg Response"
          value={formatMinutes(stats.avg_response_minutes)}
          subtitle="Average response time"
          icon={Clock}
          iconColor="bg-violet-500/10 text-violet-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Tickets by Severity */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            Tickets by Severity
          </h2>
          <div className="space-y-3">
            <SeverityBar
              label="P1 Critical"
              count={stats.tickets_by_severity?.P1 || 0}
              max={severityMax}
              color="bg-gradient-to-r from-rose-500 to-rose-400"
              dotColor="bg-rose-500"
            />
            <SeverityBar
              label="P2 High"
              count={stats.tickets_by_severity?.P2 || 0}
              max={severityMax}
              color="bg-gradient-to-r from-amber-500 to-amber-400"
              dotColor="bg-amber-500"
            />
            <SeverityBar
              label="P3 Medium"
              count={stats.tickets_by_severity?.P3 || 0}
              max={severityMax}
              color="bg-gradient-to-r from-blue-500 to-blue-400"
              dotColor="bg-blue-500"
            />
            <SeverityBar
              label="P4 Low"
              count={stats.tickets_by_severity?.P4 || 0}
              max={severityMax}
              color="bg-gradient-to-r from-slate-500 to-slate-400"
              dotColor="bg-slate-500"
            />
          </div>
        </div>

        {/* Tickets by Status */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">
            Tickets by Status
          </h2>
          <div className="space-y-3">
            {[
              { key: "new", label: "New", color: "bg-gradient-to-r from-blue-500 to-blue-400", dot: "bg-blue-500" },
              { key: "assigned", label: "Assigned", color: "bg-gradient-to-r from-amber-500 to-amber-400", dot: "bg-amber-500" },
              { key: "in_progress", label: "In Progress", color: "bg-gradient-to-r from-yellow-500 to-yellow-400", dot: "bg-yellow-500" },
              { key: "en_route", label: "En Route", color: "bg-gradient-to-r from-orange-500 to-orange-400", dot: "bg-orange-500" },
              { key: "completed", label: "Completed", color: "bg-gradient-to-r from-emerald-500 to-emerald-400", dot: "bg-emerald-500" },
              { key: "cancelled", label: "Cancelled", color: "bg-gradient-to-r from-slate-500 to-slate-400", dot: "bg-slate-500" },
            ].map(({ key, label, color, dot }) => (
              <SeverityBar
                key={key}
                label={label}
                count={stats.tickets_by_status?.[key] || 0}
                max={statusMax}
                color={color}
                dotColor={dot}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Tickets Table */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Recent Tickets</h2>
          <button
            onClick={() => router.push("/tickets")}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            View all <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {stats.recent_tickets && stats.recent_tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    ID
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Title
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Severity
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3 pr-4">
                    Category
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-3">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {stats.recent_tickets.slice(0, 10).map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer group"
                  >
                    <td className="py-3 pr-4">
                      <span className="text-sm text-slate-500 tabular-nums">
                        #{ticket.id}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-slate-200 group-hover:text-white">
                        {ticket.title}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${severityColor(
                          ticket.severity
                        )} ${ticket.severity === "P1" ? "pulse-critical" : ""}`}
                      >
                        {ticket.severity}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-sm text-slate-400">
                        {ticket.category || "—"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-slate-500">
                        {timeAgo(ticket.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Ticket className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">No tickets yet</p>
            <button
              onClick={() => router.push("/tickets/new")}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              Create your first ticket
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
