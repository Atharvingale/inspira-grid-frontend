"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/AuthContext";
import { MessagingProvider } from "@/lib/contexts/MessagingContext";
import { NotificationProvider } from "@/lib/NotificationContext";

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MessagingProvider>
          {children}
        </MessagingProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
