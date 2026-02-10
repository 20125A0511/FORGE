"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isPortalAuthenticated } from "@/lib/api";

export default function PortalHomePage() {
  const router = useRouter();
  useEffect(() => {
    if (isPortalAuthenticated()) {
      router.replace("/portal/chat");
    } else {
      router.replace("/portal/login");
    }
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="skeleton h-8 w-32 rounded" />
    </div>
  );
}
