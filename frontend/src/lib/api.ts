// ============================================================
// FORGE API Client & TypeScript Interfaces
// ============================================================

// --- Data Types ---

export interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  completed_today: number;
  avg_response_minutes: number;
  sla_compliance_rate: number;
  active_workers: number;
  total_workers: number;
  tickets_by_severity: Record<string, number>;
  tickets_by_status: Record<string, number>;
  recent_tickets: Ticket[];
}

export interface MapData {
  workers: Worker[];
  tickets: Ticket[];
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  severity: "P1" | "P2" | "P3" | "P4";
  status: string;
  equipment_type: string | null;
  category: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  skills_required: string[];
  time_estimate_minutes: number | null;
  sla_deadline: string | null;
  assigned_worker_id: number | null;
  llm_analysis: string | null;
  confidence_score: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TicketListResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateTicketData {
  title: string;
  description: string;
  equipment_type?: string;
  category?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface Worker {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  skills: string[];
  certifications: string[];
  skill_level: string;
  current_lat: number | null;
  current_lng: number | null;
  availability_status: "available" | "busy" | "offline" | "on_break";
  shift_start: string | null;
  shift_end: string | null;
  max_tickets_per_day: number;
  performance_rating: number;
  total_completed: number;
  first_time_fix_rate: number;
  avg_resolution_minutes: number;
  tools_inventory: string[];
  service_areas: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerListResponse {
  workers: Worker[];
  total: number;
}

export interface CreateWorkerData {
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  certifications?: string[];
  skill_level?: string;
  current_lat?: number;
  current_lng?: number;
  availability_status?: string;
  shift_start?: string;
  shift_end?: string;
  max_tickets_per_day?: number;
  tools_inventory?: string[];
  service_areas?: string[];
}

export interface WorkerCandidate {
  worker_id: number;
  worker_name: string;
  skill_match_score: number;
  proximity_score: number;
  availability_score: number;
  performance_score: number;
  overall_score: number;
  travel_distance_km: number;
  travel_time_minutes: number;
  matching_skills: string[];
  missing_skills: string[];
}

export interface Assignment {
  id: number;
  ticket_id: number;
  worker_id: number;
  status: string;
  assigned_at: string;
  scheduled_time: string | null;
  eta: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  ticket_title?: string;
  worker_name?: string;
}

export interface LLMAnalysis {
  ticket_id: number;
  severity: string;
  confidence_score: number;
  category: string;
  equipment_type: string;
  skills_required: string[];
  time_estimate_minutes: number;
  troubleshooting_steps: string[];
  root_cause_analysis: string;
  parts_likely_needed: string[];
  safety_considerations: string[];
}

// --- API Client ---

const API_BASE = "/api";

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `API error: ${res.status} ${res.statusText}${errorBody ? ` - ${errorBody}` : ""}`
    );
  }
  return res.json();
}

// Dashboard
export const getDashboardStats = () =>
  fetchAPI<DashboardStats>("/dashboard/stats");

export const getMapData = () => fetchAPI<MapData>("/dashboard/map-data");

// Tickets
export const getTickets = (params?: {
  page?: number;
  page_size?: number;
  status?: string;
  severity?: string;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size)
    searchParams.set("page_size", String(params.page_size));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.severity) searchParams.set("severity", params.severity);
  if (params?.search) searchParams.set("search", params.search);
  return fetchAPI<TicketListResponse>(`/tickets?${searchParams}`);
};

export const getTicket = (id: number) => fetchAPI<Ticket>(`/tickets/${id}`);

export const createTicket = (data: CreateTicketData) =>
  fetchAPI<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTicket = (id: number, data: Partial<Ticket>) =>
  fetchAPI<Ticket>(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const getTicketCandidates = (id: number) =>
  fetchAPI<WorkerCandidate[]>(`/tickets/${id}/candidates`);

export const analyzeTicket = (id: number) =>
  fetchAPI<LLMAnalysis>(`/tickets/${id}/analyze`, { method: "POST" });

// Workers
export const getWorkers = (params?: {
  status?: string;
  skill?: string;
  search?: string;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.skill) searchParams.set("skill", params.skill);
  if (params?.search) searchParams.set("search", params.search);
  return fetchAPI<WorkerListResponse>(`/workers?${searchParams}`);
};

export const getWorker = (id: number) => fetchAPI<Worker>(`/workers/${id}`);

export const createWorker = (data: CreateWorkerData) =>
  fetchAPI<Worker>("/workers", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateWorker = (id: number, data: Partial<Worker>) =>
  fetchAPI<Worker>(`/workers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// Assignments
export const getAssignments = (params?: { status?: string }) => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  return fetchAPI<Assignment[]>(`/assignments?${searchParams}`);
};

export const createAssignment = (data: {
  ticket_id: number;
  worker_id?: number;
}) =>
  fetchAPI<Assignment>("/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const autoAssignTicket = (ticketId: number) =>
  fetchAPI<Assignment>(`/assignments/auto-assign/${ticketId}`, {
    method: "POST",
  });

export const updateAssignment = (id: number, data: Partial<Assignment>) =>
  fetchAPI<Assignment>(`/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// --- Helpers ---

export function severityColor(severity: string): string {
  switch (severity) {
    case "P1":
      return "text-rose-400 bg-rose-500/10 border-rose-500/20";
    case "P2":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    case "P3":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "P4":
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

export function severityDot(severity: string): string {
  switch (severity) {
    case "P1":
      return "bg-rose-500";
    case "P2":
      return "bg-amber-500";
    case "P3":
      return "bg-blue-500";
    case "P4":
      return "bg-slate-500";
    default:
      return "bg-slate-500";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "new":
      return "text-blue-300 bg-blue-500/10 border-blue-500/20";
    case "analyzing":
      return "text-violet-300 bg-violet-500/10 border-violet-500/20";
    case "open":
      return "text-cyan-300 bg-cyan-500/10 border-cyan-500/20";
    case "assigned":
      return "text-amber-300 bg-amber-500/10 border-amber-500/20";
    case "en_route":
      return "text-orange-300 bg-orange-500/10 border-orange-500/20";
    case "in_progress":
      return "text-yellow-300 bg-yellow-500/10 border-yellow-500/20";
    case "completed":
      return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
    case "cancelled":
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
    default:
      return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }
}

export function workerStatusColor(status: string): string {
  switch (status) {
    case "available":
      return "text-emerald-400";
    case "busy":
      return "text-amber-400";
    case "offline":
      return "text-slate-500";
    case "on_break":
      return "text-violet-400";
    default:
      return "text-slate-500";
  }
}

export function workerStatusDot(status: string): string {
  switch (status) {
    case "available":
      return "bg-emerald-500";
    case "busy":
      return "bg-amber-500";
    case "offline":
      return "bg-slate-500";
    case "on_break":
      return "bg-violet-500";
    default:
      return "bg-slate-500";
  }
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// --- Public Tracking & SR Detail ---

export interface TechnicianInfo {
  name: string;
  phone: string | null;
  current_lat: number | null;
  current_lng: number | null;
  avatar_url: string | null;
}

export interface AssignmentTrackingInfo {
  status: string;
  eta: string | null;
  assigned_at: string | null;
  travel_distance_km: number | null;
  travel_time_minutes: number | null;
  actual_arrival: string | null;
  actual_completion: string | null;
}

export interface TrackingData {
  ticket_id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  category: string | null;
  equipment_type: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  sla_deadline: string | null;
  technician: TechnicianInfo | null;
  assignment: AssignmentTrackingInfo | null;
}

export interface SRDetailData {
  ticket_id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  category: string | null;
  equipment_type: string | null;
  skills_required: string[];
  time_estimate_minutes: number | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  sla_deadline: string | null;
  created_at: string;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    company: string | null;
  } | null;
  assignment_status: string | null;
  assignment_eta: string | null;
  assignment_notes: string | null;
}

export const getTrackingData = (token: string) =>
  fetchAPI<TrackingData>(`/track/${token}`);

export const getSRDetail = (ticketId: number) =>
  fetchAPI<SRDetailData>(`/sr/${ticketId}`);

// --- Customer Portal (auth + chat) ---

export interface PortalRequestOTPResponse {
  success: boolean;
  message: string;
  otp_dev?: string;
}

export interface PortalVerifyOTPResponse {
  access_token: string;
  token_type: string;
  customer_id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
}

export interface PortalChatMessage {
  role: string;
  content: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface PortalSendMessageResponse {
  message: PortalChatMessage;
  ticket_created: boolean;
  ticket_id: number | null;
  ticket_severity: string | null;
  ticket_status: string | null;
  tracking_token: string | null;
}

const PORTAL_API = "/portal";

export function requestPortalOTP(contact: string, contactType: "email" | "phone") {
  return fetchAPI<PortalRequestOTPResponse>(`${PORTAL_API}/auth/request-otp`, {
    method: "POST",
    body: JSON.stringify({ contact, contact_type: contactType }),
  });
}

export function verifyPortalOTP(
  contact: string,
  contactType: "email" | "phone",
  otp: string
) {
  return fetchAPI<PortalVerifyOTPResponse>(`${PORTAL_API}/auth/verify-otp`, {
    method: "POST",
    body: JSON.stringify({ contact, contact_type: contactType, otp }),
  });
}

function portalHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getPortalToken()}`,
    "Content-Type": "application/json",
  };
}

export function createPortalConversation(): Promise<{
  conversation_id: number;
  message: string;
}> {
  return fetchAPI(`${PORTAL_API}/conversations`, {
    method: "POST",
    headers: portalHeaders(),
  });
}

export function listPortalConversations(): Promise<{
  conversations: Array<{
    id: number;
    customer_id: number;
    ticket_id: number | null;
    created_at: string;
    updated_at: string;
    message_count: number;
  }>;
}> {
  return fetchAPI(`${PORTAL_API}/conversations`, {
    headers: portalHeaders(),
  });
}

export function getPortalConversation(conversationId: number): Promise<{
  id: number;
  customer_id: number;
  ticket_id: number | null;
  created_at: string;
  updated_at: string;
  messages: PortalChatMessage[];
}> {
  return fetchAPI(`${PORTAL_API}/conversations/${conversationId}`, {
    headers: portalHeaders(),
  });
}

export function sendPortalMessage(
  conversationId: number,
  content: string
): Promise<PortalSendMessageResponse> {
  return fetchAPI(`${PORTAL_API}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: portalHeaders(),
    body: JSON.stringify({ content }),
  });
}

const PORTAL_TOKEN_KEY = "forge_portal_token";

export function setPortalToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
}

export function getPortalToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PORTAL_TOKEN_KEY) || "";
}

export function clearPortalToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(PORTAL_TOKEN_KEY);
}

export function isPortalAuthenticated(): boolean {
  return !!getPortalToken();
}
