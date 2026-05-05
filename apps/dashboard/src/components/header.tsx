"use client";

import { usePathname } from "next/navigation";
import { Waves } from "lucide-react";
import { WalletConnection } from "@/components/wallet-connection";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/products": "Products",
  "/dashboard/products/new": "New Product",
};

function resolveTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Products sub-pages
  if (pathname.startsWith("/dashboard/products")) return "Products";

  return "Dashboard";
}

export function Header() {
  const pathname = usePathname();
  const { user } = useAuth();
  const title = resolveTitle(pathname);
  const activeBrandName = user?.brand?.name ?? "Unassigned workspace";
  const roleLabel = user?.role?.replaceAll("_", " ").toLowerCase() ?? "viewer";

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#000810]/72 px-5 backdrop-blur-xl sm:px-7 lg:px-9">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Waves className="size-3.5 text-cyan-200" />
          <p className="dashboard-kicker truncate">
            {activeBrandName}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <Badge variant="secondary" className="border border-white/10 bg-white/8 text-white/72">
            {roleLabel}
          </Badge>
        </div>
      </div>
      <WalletConnection />
    </header>
  );
}
