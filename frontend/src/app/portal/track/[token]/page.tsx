"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  MapPin,
  Clock,
  User,
  Phone,
  CheckCircle2,
  Truck,
  Wrench,
  AlertTriangle,
  Loader2,
  Navigation,
  Shield,
  RefreshCw,
} from "lucide-react";
import { getTrackingData, TrackingData, severityColor, statusColor, timeAgo } from "@/lib/api";

// Status timeline steps
const STATUS_STEPS = [
  { key: "open", label: "Request Created", icon: CheckCircle2 },
  { key: "assigned", label: "Technician Assigned", icon: User },
  { key: "en_route", label: "En Route", icon: Truck },
  { key: "in_progress", label: "Work In Progress", icon: Wrench },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function TrackingPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const techMarkerRef = useRef<google.maps.Marker | null>(null);
  const custMarkerRef = useRef<google.maps.Marker | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await getTrackingData(token);
      setData(result);
      setError(null);
    } catch {
      setError("Service request not found or invalid tracking link.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial fetch + auto-refresh every 10s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Google Maps for live technician tracking
  useEffect(() => {
    if (!data?.technician?.current_lat || !data?.technician?.current_lng) return;
    if (!mapRef.current) return;

    const techLat = data.technician.current_lat;
    const techLng = data.technician.current_lng;

    // Load Google Maps script if not loaded
    if (!(window as unknown as Record<string, unknown>).google) {
      // Without Google Maps API key, show a placeholder
      return;
    }

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: techLat, lng: techLng },
        zoom: 13,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
      });
    }

    // Update technician marker
    if (techMarkerRef.current) {
      techMarkerRef.current.setPosition({ lat: techLat, lng: techLng });
    } else {
      techMarkerRef.current = new google.maps.Marker({
        position: { lat: techLat, lng: techLng },
        map: mapInstanceRef.current,
        title: `Technician: ${data.technician.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#1e40af",
          strokeWeight: 2,
        },
      });
    }

    // Customer location marker
    if (data.location_lat && data.location_lng) {
      if (custMarkerRef.current) {
        custMarkerRef.current.setPosition({
          lat: data.location_lat,
          lng: data.location_lng,
        });
      } else {
        custMarkerRef.current = new google.maps.Marker({
          position: { lat: data.location_lat, lng: data.location_lng },
          map: mapInstanceRef.current,
          title: "Service Location",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#991b1b",
            strokeWeight: 2,
          },
        });
      }

      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: techLat, lng: techLng });
      bounds.extend({ lat: data.location_lat, lng: data.location_lng });
      mapInstanceRef.current.fitBounds(bounds, 60);
    }
  }, [data]);

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
          <h2 className="text-lg font-semibold text-white mb-2">Tracking Not Found</h2>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const currentStep = getStepIndex(data.status);
  const isCompleted = data.status === "completed";
  const hasLiveLocation =
    data.technician?.current_lat != null &&
    data.technician?.current_lng != null &&
    ["assigned", "en_route", "in_progress"].includes(data.status);

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg bg-slate-800">
              <Image src="/logo.png" alt="FORGE" fill className="object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">FORGE</h1>
              <p className="text-xs text-slate-400">Service Request Tracking</p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Ticket Summary Card */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Service Request #{data.ticket_id}</p>
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
          <p className="text-sm text-slate-300 mb-3">{data.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            {data.category && (
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> {data.category}
              </span>
            )}
            {data.equipment_type && (
              <span className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" /> {data.equipment_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Created {timeAgo(data.created_at)}
            </span>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Status Timeline</h3>
          <div className="relative">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = idx <= currentStep;
              const isCurrent = idx === currentStep;
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex items-start gap-3 relative">
                  {/* Vertical line */}
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[15px] top-[30px] w-0.5 h-8 ${
                        idx < currentStep ? "bg-blue-500" : "bg-slate-700"
                      }`}
                    />
                  )}
                  {/* Circle */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 ${
                      isCurrent
                        ? "border-blue-500 bg-blue-500/20"
                        : isActive
                        ? "border-emerald-500 bg-emerald-500/20"
                        : "border-slate-600 bg-slate-800"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isCurrent
                          ? "text-blue-400"
                          : isActive
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    />
                  </div>
                  {/* Label */}
                  <div className={`pb-6 ${idx === STATUS_STEPS.length - 1 ? "pb-0" : ""}`}>
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-blue-300"
                          : isActive
                          ? "text-emerald-300"
                          : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </p>
                    {isCurrent && !isCompleted && (
                      <p className="text-xs text-slate-400 mt-0.5">Current status</p>
                    )}
                    {isCompleted && idx === currentStep && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        Completed {data.completed_at ? timeAgo(data.completed_at) : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Technician Details */}
        {data.technician && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Your Technician</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                {data.technician.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-white">{data.technician.name}</p>
                {data.technician.phone && (
                  <a
                    href={`tel:${data.technician.phone}`}
                    className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 mt-1"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {data.technician.phone}
                  </a>
                )}
              </div>
              {data.assignment?.eta && new Date(data.assignment.eta) > new Date() && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">ETA</p>
                  <p className="text-sm font-semibold text-amber-400">
                    {new Date(data.assignment.eta).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
            {data.assignment && (
              <div className="flex gap-4 mt-4 text-xs text-slate-400">
                {data.assignment.travel_distance_km && (
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {data.assignment.travel_distance_km.toFixed(1)} km away
                  </span>
                )}
                {data.assignment.travel_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{Math.round(data.assignment.travel_time_minutes)} min travel
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Location Map */}
        {hasLiveLocation && (
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                Live Technician Location
              </h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <div
              ref={mapRef}
              className="w-full h-64 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden"
            >
              {/* Fallback when Google Maps not available */}
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <MapPin className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">Technician Location</p>
                <p className="text-xs mt-1">
                  {data.technician?.name} — {data.technician?.current_lat?.toFixed(4)},{" "}
                  {data.technician?.current_lng?.toFixed(4)}
                </p>
                {data.location_lat && data.location_lng && (
                  <a
                    href={`https://www.google.com/maps/dir/${data.technician?.current_lat},${data.technician?.current_lng}/${data.location_lat},${data.location_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/30"
                  >
                    View on Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Location Info */}
        {data.location_address && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Service Location
            </h3>
            <p className="text-sm text-slate-300">{data.location_address}</p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <p className="text-center text-xs text-slate-600">
          Auto-refreshes every 10 seconds
        </p>
      </div>
    </div>
  );
}
