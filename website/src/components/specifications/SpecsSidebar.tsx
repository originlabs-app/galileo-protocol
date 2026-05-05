"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { SpecNavSection } from "@/lib/specs-navigation";

// ============================================================================
// Types
// ============================================================================

interface SpecsSidebarProps {
  navigation: SpecNavSection[];
}

// ============================================================================
// Status Badge Component
// ============================================================================

interface StatusDotProps {
  status: "Draft" | "Active" | "Standard";
}

const statusColors = {
  Draft: "bg-yellow-500",
  Active: "bg-green-500",
  Standard: "bg-blue-500",
};

const statusLabels = {
  Draft: "Draft specification",
  Active: "Active specification",
  Standard: "Finalized standard",
};

function StatusDot({ status }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${statusColors[status]} opacity-60`}
      title={statusLabels[status]}
      aria-label={statusLabels[status]}
    />
  );
}

// ============================================================================
// Status Legend Component
// ============================================================================

function StatusLegend() {
  return (
    <div className="pt-4 border-t border-[var(--platinum)]/10">
      <p className="text-xs text-[var(--platinum-dim)] mb-2">Status</p>
      <div className="space-y-1 text-xs text-[var(--platinum-dim)]">
        <div className="flex items-center gap-2">
          <StatusDot status="Draft" />
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="Active" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status="Standard" />
          <span>Standard</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sidebar Component
// ============================================================================

export function SpecsSidebar({ navigation }: SpecsSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Initialize all sections as expanded
  const [expanded, setExpanded] = useState<string[]>(
    navigation.map((s) => s.title),
  );

  // Close mobile sidebar on route change
  useEffect(() => {
    const id = requestAnimationFrame(() => setMobileOpen(false));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleSection = (title: string) => {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const navContent = (
    <>
      {/* Sidebar header */}
      <div className="pb-4 border-b border-[var(--platinum)]/10">
        <Link
          href="/specifications"
          className="text-sm font-medium text-[var(--platinum)] hover:text-[var(--cyan-primary)] transition-colors"
        >
          All Specifications
        </Link>
      </div>

      {/* Category sections */}
      {navigation.map((section) => (
        <div key={section.title}>
          {/* Section header (collapsible) */}
          <button
            onClick={() => toggleSection(section.title)}
            className="flex items-center justify-between w-full text-sm font-medium text-[var(--platinum)] mb-3 hover:text-[var(--cyan-primary)] transition-colors"
          >
            <span className="flex items-center gap-2">
              {section.title}
              <span className="text-xs text-[var(--platinum-dim)]">
                ({section.items.length})
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expanded.includes(section.title) ? "" : "-rotate-90"
              }`}
            />
          </button>

          {/* Section items */}
          {expanded.includes(section.title) && (
            <ul className="space-y-1 pl-3 border-l border-[var(--platinum)]/10">
              {section.items.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "text-[var(--cyan-primary)] font-medium border-l-2 border-[var(--cyan-primary)] -ml-[calc(0.75rem+1px)] pl-[calc(0.75rem-1px)]"
                          : "text-[var(--platinum-dim)] hover:text-[var(--platinum)]"
                      }`}
                    >
                      <StatusDot status={item.status} />
                      <span className="truncate" title={item.title}>
                        {item.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      {/* Status legend */}
      <StatusLegend />
    </>
  );

  return (
    <>
      {/* Mobile: floating toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--obsidian)] border border-[var(--cyan-primary)]/30 text-[var(--cyan-primary)] shadow-lg shadow-black/30 hover:border-[var(--cyan-primary)]/50 transition-colors"
        aria-label="Open specifications menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-sm font-medium">Specs</span>
      </button>

      {/* Mobile: slide-in overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[var(--obsidian)] border-r border-[var(--platinum)]/10 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--platinum)]/10 bg-[var(--obsidian)]">
              <span className="text-sm font-medium text-[var(--platinum)]">
                Specifications
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-[var(--platinum-dim)] hover:text-[var(--platinum)] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-4 space-y-6">{navContent}</nav>
          </aside>
        </div>
      )}

      {/* Desktop: static sidebar */}
      <aside className="w-64 shrink-0 hidden lg:block">
        <nav className="sticky top-24 pr-6 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {navContent}
        </nav>
      </aside>
    </>
  );
}
