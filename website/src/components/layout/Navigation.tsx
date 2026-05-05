'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Protocol', href: '/docs' },
  { label: 'Specifications', href: '/specifications' },
  { label: 'Governance', href: '/governance' },
  { label: 'La Maison', href: '/maison' },
  { label: 'Blog', href: '/blog' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Roadmap', href: '/roadmap' },
  { label: 'Tools', href: '/tools' },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[rgba(2,4,8,0.9)] backdrop-blur-xl'
            : 'bg-transparent'
        }`}
      >
        {/* Subtle bottom border that fades in on scroll */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px] transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent)',
            opacity: isScrolled ? 1 : 0,
          }}
        />

        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="group relative">
              <span
                className="text-2xl md:text-3xl font-extralight tracking-[-0.04em] text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-emerald-400 transition-all duration-500"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                GALILEO
              </span>
              {/* Subtle glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10"
                style={{
                  background: 'linear-gradient(90deg, rgba(0,255,255,0.3), rgba(0,255,136,0.3))',
                }}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-10">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative text-sm text-white/60 hover:text-white transition-colors duration-300"
                >
                  <span className="relative z-10">{item.label}</span>
                  {/* Underline effect */}
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-cyan-400 to-emerald-400 group-hover:w-full transition-all duration-300"
                  />
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="hidden md:flex items-center gap-6">
              {/* GitHub */}
              <a
                href="https://github.com/originlabs-app/galileo-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-300"
                aria-label="GitHub"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>

              {/* CTA */}
              <Link
                href="/docs/quick-start"
                className="group relative px-6 py-2.5 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-0 group-hover:opacity-100 blur-lg transition-opacity" />
                <span className="relative z-10 text-sm tracking-wide text-black font-medium">
                  Get Started
                </span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden relative w-10 h-10 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-5 flex flex-col justify-between">
                <span
                  className={`block h-[1.5px] bg-white transition-all duration-300 ${
                    isOpen ? 'rotate-45 translate-y-[9px]' : ''
                  }`}
                />
                <span
                  className={`block h-[1.5px] bg-white transition-all duration-300 ${
                    isOpen ? 'opacity-0 scale-0' : ''
                  }`}
                />
                <span
                  className={`block h-[1.5px] bg-white transition-all duration-300 ${
                    isOpen ? '-rotate-45 -translate-y-[9px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-all duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
          onClick={() => setIsOpen(false)}
        />

        {/* Menu content */}
        <div
          className={`absolute inset-x-0 top-20 bottom-0 flex flex-col px-6 pt-8 transition-all duration-500 ${
            isOpen ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
          }`}
        >
          {/* Nav items */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="py-4 text-2xl font-light text-white/80 hover:text-cyan-400 transition-colors border-b border-white/5"
                style={{
                  fontFamily: 'var(--font-serif)',
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile CTA */}
          <div className="mt-8">
            <Link
              href="/docs/quick-start"
              onClick={() => setIsOpen(false)}
              className="block w-full py-4 text-center bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-medium tracking-wide"
            >
              Get Started
            </Link>
          </div>

          {/* Bottom info */}
          <div className="mt-auto pb-8">
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/originlabs-app/galileo-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-cyan-400 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <span className="text-xs text-white/20">
                Galileo Protocol · MMXXVI
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
