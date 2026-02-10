"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ticket as TicketIcon,
  User,
  Clock,
} from "lucide-react";
import {
  getTickets,
  Ticket,
  severityColor,
  statusColor,
  timeAgo,
} from "@/lib/api";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTickets({
        page,
        page_size: pageSize,
        severity: severity || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, severity, status, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-slate-400 mt-1">
            {total} total ticket{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/tickets/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
          </div>

          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Severities</option>
            <option value="P1">P1 - Critical</option>
            <option value="P2">P2 - High</option>
            <option value="P3">P3 - Medium</option>
            <option value="P4">P4 - Low</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="analyzing">Analyzing</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="en_route">En Route</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tickets..."
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
            onClick={fetchData}
            className="ml-auto text-sm text-rose-400 hover:text-rose-300 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="skeleton h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-3">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="flex gap-3">
                    <div className="skeleton h-4 w-16" />
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-4 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className={`glass rounded-xl p-5 glass-hover cursor-pointer group ${
                ticket.severity === "P1"
                  ? "border-rose-500/20 hover:border-rose-500/40"
                  : ""
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <TicketIcon
                    className={`w-5 h-5 ${
                      ticket.severity === "P1"
                        ? "text-rose-400"
                        : ticket.severity === "P2"
                          ? "text-amber-400"
                          : "text-slate-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                      #{ticket.id}
                    </span>
                    <h3 className="text-sm font-medium text-slate-200 group-hover:text-white truncate">
                      {ticket.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${severityColor(
                        ticket.severity
                      )} ${ticket.severity === "P1" ? "pulse-critical" : ""}`}
                    >
                      {ticket.severity}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.replace(/_/g, " ")}
                    </span>
                    {ticket.category && (
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                        {ticket.category}
                      </span>
                    )}
                    {ticket.customer_name && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" />
                        {ticket.customer_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {timeAgo(ticket.created_at)}
                  </span>
                  {ticket.assigned_worker_id && (
                    <span className="text-xs text-emerald-400">Assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <TicketIcon className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-1">
            No tickets found
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {search || severity || status
              ? "Try adjusting your filters"
              : "Create your first service ticket"}
          </p>
          <button
            onClick={() => router.push("/tickets/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${
                    page === pageNum
                      ? "bg-blue-500 text-white"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
