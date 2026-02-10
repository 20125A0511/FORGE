"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  Star,
  CheckCircle2,
  Wrench,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MapPin,
  Award,
  Target,
  Briefcase,
  X,
  Loader2,
  Users as UsersIcon,
} from "lucide-react";
import {
  getWorkers,
  createWorker,
  Worker,
  workerStatusColor,
  workerStatusDot,
  CreateWorkerData,
} from "@/lib/api";

function WorkerCard({
  worker,
  expanded,
  onToggle,
}: {
  worker: Worker;
  expanded: boolean;
  onToggle: () => void;
}) {
  const initials = worker.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const avatarColors: Record<string, string> = {
    available: "from-emerald-500 to-teal-500",
    busy: "from-amber-500 to-orange-500",
    offline: "from-slate-500 to-slate-600",
    on_break: "from-violet-500 to-purple-500",
  };

  return (
    <div
      className="glass rounded-xl p-5 glass-hover cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${
            avatarColors[worker.availability_status] || avatarColors.offline
          } flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg`}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name & Status */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {worker.name}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${workerStatusColor(
                worker.availability_status
              )}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${workerStatusDot(
                  worker.availability_status
                )}`}
              />
              {worker.availability_status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Skill Level */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
              {worker.skill_level}
            </span>
            <span className="text-xs text-slate-500">
              ID #{worker.id}
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {worker.skills.slice(0, expanded ? undefined : 4).map((skill, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
              >
                {skill}
              </span>
            ))}
            {!expanded && worker.skills.length > 4 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] text-slate-500">
                +{worker.skills.length - 4} more
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400" />
              {worker.performance_rating.toFixed(1)}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {worker.total_completed} completed
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-blue-400" />
              {Math.round(worker.first_time_fix_rate * 100)}% FTF
            </span>
          </div>
        </div>

        {/* Expand */}
        <div className="flex-shrink-0 text-slate-500">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Contact
              </h4>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {worker.email}
              </div>
              {worker.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {worker.phone}
                </div>
              )}
            </div>

            {/* Performance */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Performance
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Avg Resolution</span>
                  <span className="text-slate-300">
                    {Math.round(worker.avg_resolution_minutes)} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Max Tickets/Day</span>
                  <span className="text-slate-300">
                    {worker.max_tickets_per_day}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Rating</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.round(worker.performance_rating)
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-xs tabular-nums">
                      {worker.performance_rating.toFixed(1)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Certifications */}
            {worker.certifications && worker.certifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Certifications
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {worker.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    >
                      <Award className="w-3 h-3" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Service Areas */}
            {worker.service_areas && worker.service_areas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Service Areas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {worker.service_areas.map((area, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50"
                    >
                      <MapPin className="w-3 h-3" />
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Shift */}
            {(worker.shift_start || worker.shift_end) && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Shift
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {worker.shift_start || "—"} – {worker.shift_end || "—"}
                </div>
              </div>
            )}

            {/* Tools */}
            {worker.tools_inventory && worker.tools_inventory.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tools Inventory
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {worker.tools_inventory.map((tool, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/50"
                    >
                      <Wrench className="w-3 h-3" />
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Add Worker Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
    skill_level: "junior",
  });
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorkers({
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setWorkers(data.workers || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workers");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdding(true);
      const data: CreateWorkerData = {
        name: addForm.name,
        email: addForm.email,
        skill_level: addForm.skill_level,
      };
      if (addForm.phone) data.phone = addForm.phone;
      if (addForm.skills) {
        data.skills = addForm.skills.split(",").map((s) => s.trim()).filter(Boolean);
      }
      await createWorker(data);
      setShowAddModal(false);
      setAddForm({ name: "", email: "", phone: "", skills: "", skill_level: "junior" });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add worker");
    } finally {
      setAdding(false);
    }
  };

  const statusCounts = {
    available: workers.filter((w) => w.availability_status === "available").length,
    busy: workers.filter((w) => w.availability_status === "busy").length,
    offline: workers.filter((w) => w.availability_status === "offline").length,
    on_break: workers.filter((w) => w.availability_status === "on_break").length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Field Workers</h1>
          <p className="text-slate-400 mt-1">
            {total} worker{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Worker
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Available", count: statusCounts.available, color: "text-emerald-400", dot: "bg-emerald-500", value: "available" },
          { label: "Busy", count: statusCounts.busy, color: "text-amber-400", dot: "bg-amber-500", value: "busy" },
          { label: "Offline", count: statusCounts.offline, color: "text-slate-400", dot: "bg-slate-500", value: "offline" },
          { label: "On Break", count: statusCounts.on_break, color: "text-violet-400", dot: "bg-violet-500", value: "on_break" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() =>
              setStatusFilter(statusFilter === item.value ? "" : item.value)
            }
            className={`glass rounded-xl p-4 cursor-pointer text-left ${
              statusFilter === item.value ? "border-blue-500/40 bg-blue-500/5" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${item.dot}`} />
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
            <span className={`text-2xl font-bold ${item.color} tabular-nums`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
            <option value="on_break">On Break</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search workers..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 cursor-pointer"
          >
            Search
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      )}

      {/* Workers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-5 w-40" />
                  <div className="skeleton h-4 w-24" />
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-16 rounded-full" />
                    <div className="skeleton h-5 w-20 rounded-full" />
                    <div className="skeleton h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : workers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              expanded={expandedId === worker.id}
              onToggle={() =>
                setExpandedId(expandedId === worker.id ? null : worker.id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <UsersIcon className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">
            No workers found
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {search || statusFilter
              ? "Try adjusting your filters"
              : "Add your first field worker"}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Worker
          </button>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Add New Worker
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="worker@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm({ ...addForm, phone: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={addForm.skills}
                  onChange={(e) =>
                    setAddForm({ ...addForm, skills: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="HVAC, Plumbing, Electrical"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Skill Level
                </label>
                <select
                  value={addForm.skill_level}
                  onChange={(e) =>
                    setAddForm({ ...addForm, skill_level: e.target.value })
                  }
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-Level</option>
                  <option value="senior">Senior</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-lg text-sm font-medium text-white cursor-pointer"
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Worker
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
