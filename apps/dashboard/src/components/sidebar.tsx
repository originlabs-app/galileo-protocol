"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Gem,
  Home,
  LogOut,
  Package,
  Settings,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Products", href: "/dashboard/products", icon: Package },
  {
    label: "Webhooks",
    href: "/dashboard/webhooks",
    icon: Webhook,
    roles: ["ADMIN", "BRAND_ADMIN"],
  },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  {
    label: "Audit log",
    href: "/dashboard/audit",
    icon: ClipboardList,
    roles: ["ADMIN", "BRAND_ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const activeBrandName = user?.brand?.name ?? "Unassigned workspace";
  const roleLabel = user?.role?.replaceAll("_", " ").toLowerCase() ?? "viewer";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-white/10 bg-[#000810]/82 backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative flex size-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <Gem className="size-5" />
            <span className="absolute inset-x-2 bottom-1 h-px bg-cyan-200/40" />
          </div>
          <div className="min-w-0">
            <p className="dashboard-kicker">Galileo Protocol</p>
            <p className="truncate font-serif text-xl font-semibold text-foreground">
              Abysse OS
            </p>
          </div>
        </Link>

        <div className="dashboard-panel mt-5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-200">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground">
                {activeBrandName}
              </h1>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Live product passport control room
              </p>
            </div>
          </div>
          <Badge variant="outline" className="mt-4 border-cyan-300/20 bg-cyan-300/8 text-cyan-100">
            {roleLabel}
          </Badge>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems
          .filter(
            (item) =>
              !item.roles || (user?.role && item.roles.includes(user.role)),
          )
          .map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    : "text-white/68 hover:bg-white/7 hover:text-white",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4",
                    isActive ? "text-cyan-200" : "text-white/45 group-hover:text-cyan-100",
                  )}
                />
                {item.label}
              </Link>
            );
          })}

        <div className="flex-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/62 transition-colors hover:bg-white/7 hover:text-white"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </nav>
    </aside>
  );
}
