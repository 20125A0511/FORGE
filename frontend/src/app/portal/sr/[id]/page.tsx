"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Building,
  Wrench,
  AlertTriangle,
  Loader2,
  Shield,
  Target,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { getSRDetail, SRDetailData, severityColor, statusColor } from "@/lib/api";

export default function SRDetailPage() {
  const params = useParams();
  const ticketId = Number(params.id);
  const [data, setData] = useState<SRDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    getSRDetail(ticketId)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch(() => {
        setError("Service request not found.");
      })
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Not Found</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-slate-800">
            <Image src="/logo.png" alt="FORGE" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">FORGE</h1>
            <p className="text-xs text-slate-400">Service Request Detail</p>
          </div>
        </div>

        {/* Ticket Summary */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">SR #{data.ticket_id}</p>
              <h2 className="text-lg font-semibold text-white">{data.title}</h2>
            </div>
            <div className="flex gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${severityColor(data.severity)}`}>
                {data.severity}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(data.status)}`}>
                {data.status.replace("_", " ")}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-300">{data.description}</p>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {data.category && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Category: <span className="text-slate-300">{data.category}</span></span>
              </div>
            )}
            {data.equipment_type && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>Equipment: <span className="text-slate-300">{data.equipment_type}</span></span>
              </div>
            )}
            {data.time_estimate_minutes && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Est. Time: <span className="text-slate-300">{data.time_estimate_minutes} min</span></span>
              </div>
            )}
            {data.sla_deadline && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Target className="w-3.5 h-3.5 text-slate-500" />
                <span>SLA: <span className="text-slate-300">{new Date(data.sla_deadline).toLocaleString()}</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Skills Required */}
        {data.skills_required.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              Skills Required
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.skills_required.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Customer Info */}
        {data.customer && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Customer Information
            </h3>
            <div className="space-y-2.5">
              {data.customer.name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{data.customer.name}</span>
                </div>
              )}
              {data.customer.phone && (
                <a
                  href={`tel:${data.customer.phone}`}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Phone className="w-4 h-4" />
                  {data.customer.phone}
                </a>
              )}
              {data.customer.email && (
                <a
                  href={`mailto:${data.customer.email}`}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <Mail className="w-4 h-4" />
                  {data.customer.email}
                </a>
              )}
              {data.customer.company && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{data.customer.company}</span>
                </div>
              )}
              {data.customer.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-300">{data.customer.address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location */}
        {data.location_address && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Service Location
            </h3>
            <p className="text-sm text-slate-300 mb-3">{data.location_address}</p>
            {data.location_lat && data.location_lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${data.location_lat},${data.location_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30"
              >
                <MapPin className="w-4 h-4" />
                Navigate to Location
              </a>
            )}
          </div>
        )}

        {/* Assignment Info */}
        {(data.assignment_status || data.assignment_notes) && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Assignment Details
            </h3>
            <div className="space-y-2">
              {data.assignment_status && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-slate-400">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${statusColor(data.assignment_status)}`}>
                    {data.assignment_status.replace("_", " ")}
                  </span>
                </div>
              )}
              {data.assignment_eta && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-slate-400">ETA:</span>
                  {new Date(data.assignment_eta).toLocaleString()}
                </div>
              )}
              {data.assignment_notes && (
                <div className="text-sm text-slate-300">
                  <span className="text-slate-400">Notes:</span> {data.assignment_notes}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
