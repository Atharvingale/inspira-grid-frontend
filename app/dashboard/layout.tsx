"use client";
import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";

interface DashboardLayoutProps { children: ReactNode; }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ background: 'var(--ig-bg)' }}>
        <Navbar />
        <main className="pb-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
