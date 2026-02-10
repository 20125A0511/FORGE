"use client";

import "./portal.css";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-layout min-h-screen bg-[#0f172a] flex flex-col">
      {children}
    </div>
  );
}
