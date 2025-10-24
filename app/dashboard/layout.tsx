"use client";

import { ReactNode } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";
import { MessagingProvider } from "@/lib/contexts/MessagingContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProtectedRoute>
      <MessagingProvider>
        <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-surface">
          <Navbar />
          <main className="pb-8">
            {children}
          </main>
        </div>
      </MessagingProvider>
    </ProtectedRoute>
  );
}
