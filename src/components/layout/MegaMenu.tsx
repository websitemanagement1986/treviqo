"use client";

import Link from "next/link";
import { useState } from "react";
import { useSite } from "@/context/SiteContext";
import { IconChevronDown } from "@/components/icons";

export function MegaMenu() {
  const { navigation } = useSite();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4">
        <ul className="hidden md:flex items-center gap-0 overflow-x-auto">
          {navigation.main.map((item, index) => (
            <li
              key={item.label}
              className="relative flex-shrink-0"
              onMouseEnter={() => setOpenIndex(index)}
              onMouseLeave={() => setOpenIndex(null)}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-1 px-4 py-3.5 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${
                  item.label === "Sale"
                    ? "text-[var(--color-primary)] border-transparent hover:border-[var(--color-primary)]"
                    : "text-[var(--color-accent)] border-transparent hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                }`}
              >
                {item.label}
                {item.children && <IconChevronDown className="w-3 h-3" />}
              </Link>
              {item.children && openIndex === index && (
                <div className="absolute left-0 top-full z-50 min-w-[200px] bg-white border border-gray-200 shadow-lg py-2">
                  {item.children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className="block px-4 py-2 text-sm hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* Mobile nav toggle */}
        <button
          className="md:hidden flex items-center gap-2 py-3 text-sm font-semibold"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? "Close Menu" : "Shop Categories"}
          <IconChevronDown className={`w-4 h-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>

        {mobileOpen && (
          <div className="md:hidden pb-4">
            {navigation.main.map((item) => (
              <div key={item.label} className="border-t border-gray-100">
                <Link
                  href={item.href}
                  className="block py-3 text-sm font-semibold uppercase"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="pl-4 pb-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.label}
                        href={child.href}
                        className="block py-1.5 text-sm text-[var(--color-text-muted)]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
