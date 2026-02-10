"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Target,
  Clock,
  Shield,
  Users,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Award,
  Wrench,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  getDashboardStats,
  getWorkers,
  DashboardStats,
  Worker,
  formatMinutes,
} from "@/lib/api";

function GaugeChart({
  value,
  label,
  color,
  icon: Icon,
}: {
  value: number;
  label: string;
  color: string;
  icon: React.ElementType;
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="glass rounded-xl p-6 flex flex-col items-center">
      <div className="relative w-28 h-28 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-800"
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white tabular-nums">
            {Math.round(value)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color.replace("text-", "text-")}`} />
        <span className="text-sm font-medium text-slate-400">{label}</span>
      </div>
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, 3) : 3;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-slate-400 group-hover:text-slate-300">
          {label}
        </span>
        <span className="text-sm font-semibold text-slate-300 tabular-nums">
          {value}
        </span>
      </div>
      <div className="h-6 bg-slate-800/50 rounded-md overflow-hidden">
        <div
          className={`h-full rounded-md ${color} transition-all duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function WorkerPerformanceBar({
  name,
  completed,
  rating,
  maxCompleted,
}: {
  name: string;
  completed: number;
  rating: number;
  maxCompleted: number;
}) {
  const width =
    maxCompleted > 0 ? Math.max((completed / maxCompleted) * 100, 3) : 3;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 group-hover:text-slate-300">
            {name}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            {rating.toFixed(1)}
          </span>
        </div>
        <span className="text-sm font-semibold text-slate-300 tabular-nums">
          {completed}
        </span>
      </div>
      <div className="h-5 bg-slate-800/50 rounded-md overflow-hidden">
        <div
          className="h-full rounded-md bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, workersData] = await Promise.all([
        getDashboardStats(),
        getWorkers(),
      ]);
      setStats(statsData);
      setWorkers(workersData.workers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-72 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-52 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-rose-400" />
        <h2 className="text-xl font-semibold text-white">Error Loading Analytics</h2>
        <p className="text-slate-400">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-500 rounded-lg text-sm text-white cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  // Calculate metrics
  const avgFirstTimeFix =
    workers.length > 0
      ? (workers.reduce((sum, w) => sum + w.first_time_fix_rate, 0) /
          workers.length) *
        100
      : 0;

  const busyWorkerCount = workers.filter(w => w.availability_status === "busy").length;
  const workerUtilization =
    stats.total_workers > 0
      ? (busyWorkerCount / stats.total_workers) * 100
      : 0;

  // Top performers
  const topPerformers = [...workers]
    .sort((a, b) => b.total_completed - a.total_completed)
    .slice(0, 8);
  const maxCompleted = topPerformers.length > 0 ? topPerformers[0].total_completed : 1;

  // Category data - compute from tickets_by_status as a proxy, or use an empty object
  // The backend doesn't provide tickets_by_category directly, but we compute it from the tickets list
  const categoryFromTickets: Record<string, number> = {};
  if (stats.recent_tickets) {
    stats.recent_tickets.forEach((t) => {
      const cat = t.category || "Uncategorized";
      categoryFromTickets[cat] = (categoryFromTickets[cat] || 0) + 1;
    });
  }
  const categoryEntries = Object.entries(categoryFromTickets).sort(
    (a, b) => b[1] - a[1]
  );
  const maxCategoryCount = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;

  // Severity data
  const severityEntries = [
    { label: "P1 Critical", key: "P1", color: "bg-gradient-to-r from-rose-500 to-rose-400" },
    { label: "P2 High", key: "P2", color: "bg-gradient-to-r from-amber-500 to-amber-400" },
    { label: "P3 Medium", key: "P3", color: "bg-gradient-to-r from-blue-500 to-blue-400" },
    { label: "P4 Low", key: "P4", color: "bg-gradient-to-r from-slate-500 to-slate-400" },
  ];
  const maxSeverityCount = Math.max(
    ...Object.values(stats.tickets_by_severity || {}),
    1
  );

  const categoryColors = [
    "bg-gradient-to-r from-blue-500 to-cyan-400",
    "bg-gradient-to-r from-violet-500 to-purple-400",
    "bg-gradient-to-r from-emerald-500 to-teal-400",
    "bg-gradient-to-r from-amber-500 to-orange-400",
    "bg-gradient-to-r from-rose-500 to-pink-400",
    "bg-gradient-to-r from-indigo-500 to-blue-400",
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Analytics & Insights
          </h1>
          <p className="text-slate-400 mt-1">
            Performance metrics and operational intelligence
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GaugeChart
          value={avgFirstTimeFix}
          label="First-Time Fix Rate"
          color="text-emerald-500"
          icon={Target}
        />
        <div className="glass rounded-xl p-6 flex flex-col items-center">
          <div className="w-28 h-28 mb-4 flex items-center justify-center">
            <div className="text-center">
              <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <span className="text-3xl font-bold text-white">
                {formatMinutes(stats.avg_response_minutes)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-400">
              Avg Resolution
            </span>
          </div>
        </div>
        <GaugeChart
          value={stats.sla_compliance_rate || 0}
          label="SLA Compliance"
          color={
            (stats.sla_compliance_rate || 0) >= 90
              ? "text-emerald-500"
              : (stats.sla_compliance_rate || 0) >= 80
                ? "text-amber-500"
                : "text-rose-500"
          }
          icon={Shield}
        />
        <GaugeChart
          value={workerUtilization}
          label="Worker Utilization"
          color="text-violet-500"
          icon={Users}
        />
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-500 uppercase">Completed</span>
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.completed_today}
          </span>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500 uppercase">Open</span>
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.open_tickets}
          </span>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-500 uppercase">Workers</span>
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.total_workers}
          </span>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span className="text-xs text-slate-500 uppercase">In Progress</span>
          </div>
          <span className="text-2xl font-bold text-white tabular-nums">
            {stats.in_progress_tickets}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tickets by Category */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Wrench className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Tickets by Category
            </h2>
          </div>
          <div className="space-y-4">
            {categoryEntries.length > 0 ? (
              categoryEntries.map(([category, count], idx) => (
                <HorizontalBar
                  key={category}
                  label={category}
                  value={count}
                  max={maxCategoryCount}
                  color={categoryColors[idx % categoryColors.length]}
                />
              ))
            ) : (
              <p className="text-center text-slate-500 py-8">
                No category data available
              </p>
            )}
          </div>
        </div>

        {/* Tickets by Severity */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-rose-400" />
            <h2 className="text-lg font-semibold text-white">
              Tickets by Severity
            </h2>
          </div>
          <div className="space-y-4">
            {severityEntries.map(({ label, key, color }) => (
              <HorizontalBar
                key={key}
                label={label}
                value={stats.tickets_by_severity?.[key] || 0}
                max={maxSeverityCount}
                color={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">
            Top Performing Workers
          </h2>
          <span className="text-sm text-slate-500">
            (by completed tickets)
          </span>
        </div>
        {topPerformers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {topPerformers.map((worker) => (
              <WorkerPerformanceBar
                key={worker.id}
                name={worker.name}
                completed={worker.total_completed}
                rating={worker.performance_rating}
                maxCompleted={maxCompleted}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">
            No worker data available
          </p>
        )}
      </div>
    </div>
  );
}
