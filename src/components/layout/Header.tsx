"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { useSite } from "@/context/SiteContext";
import { useCart } from "@/context/CartContext";
import { IconSearch, IconUser, IconCart, IconHeart } from "@/components/icons";

export function Header() {
  const { site } = useSite();
  const { itemCount } = useCart();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-4 lg:gap-8">
            <Link href="/" className="flex-shrink-0">
              <span
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-primary)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {site.name}
              </span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
              <div className="flex w-full border border-gray-200 rounded-sm overflow-hidden focus-within:border-[var(--color-primary)]">
                <input
                  type="text"
                  placeholder="Search for products, brands and more"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm outline-none bg-[var(--color-surface)]"
                />
                <button
                  type="submit"
                  className="bg-[var(--color-primary)] text-white px-5 flex items-center hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  <IconSearch className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-4 sm:gap-6 ml-auto">
              <button
                className="md:hidden p-1"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label="Search"
              >
                <IconSearch />
              </button>
              <Link href="#" className="hidden sm:flex flex-col items-center text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-primary)]">
                <IconUser className="mb-0.5 w-5 h-5" />
                <span>Profile</span>
              </Link>
              <Link href="#" className="hidden sm:flex flex-col items-center text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-primary)]">
                <IconHeart className="mb-0.5 w-5 h-5" />
                <span>Wishlist</span>
              </Link>
              <Link href="/cart" className="flex flex-col items-center text-xs font-semibold text-[var(--color-accent)] hover:text-[var(--color-primary)] relative">
                <IconCart className="mb-0.5 w-5 h-5" />
                <span>Bag</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {mobileSearchOpen && (
            <form onSubmit={handleSearch} className="md:hidden mt-3">
              <div className="flex border border-gray-200 rounded-sm overflow-hidden">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm outline-none bg-[var(--color-surface)]"
                  autoFocus
                />
                <button type="submit" className="bg-[var(--color-primary)] text-white px-4">
                  <IconSearch className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-surface)] text-center text-xs py-1.5 text-[var(--color-text-muted)] hidden sm:block">
        {site.promoBar}
      </div>
    </header>
  );
}
