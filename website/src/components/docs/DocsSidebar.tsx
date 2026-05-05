"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import type { NavSection } from "@/lib/docs-navigation";

interface DocsSidebarProps {
  navigation: NavSection[];
}

export function DocsSidebar({ navigation }: DocsSidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(
    navigation.map((s) => s.title),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

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
      {navigation.map((section) => (
        <div key={section.title}>
          <button
            onClick={() => toggleSection(section.title)}
            className="flex items-center justify-between w-full text-sm font-medium text-[var(--platinum)] mb-3 hover:text-[var(--cyan-primary)] transition-colors"
          >
            {section.title}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                expanded.includes(section.title) ? "" : "-rotate-90"
              }`}
            />
          </button>
          {expanded.includes(section.title) && (
            <ul className="space-y-1 pl-3 border-l border-[var(--platinum)]/10">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block py-1.5 text-sm transition-colors ${
                        isActive
                          ? "text-[var(--cyan-primary)] font-medium border-l-2 border-[var(--cyan-primary)] -ml-[calc(0.75rem+1px)] pl-[calc(0.75rem-1px)]"
                          : "text-[var(--platinum-dim)] hover:text-[var(--platinum)]"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile: floating toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--obsidian)] border border-[var(--cyan-primary)]/30 text-[var(--cyan-primary)] shadow-lg shadow-black/30 hover:border-[var(--cyan-primary)]/50 transition-colors"
        aria-label="Open documentation menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-sm font-medium">Docs</span>
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
                Documentation
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
        <nav className="sticky top-32 pr-6 space-y-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {navContent}
        </nav>
      </aside>
    </>
  );
}
