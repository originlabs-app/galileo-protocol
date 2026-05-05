"use client";

import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="dashboard-ocean-shell flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-7 lg:px-9">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
