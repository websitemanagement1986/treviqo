"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { useSite } from "@/context/SiteContext";

export function Footer() {
  const { site, navigation } = useSite();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="bg-[var(--color-accent)] text-white mt-16">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="border-b border-white/20 pb-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-lg font-semibold mb-2">Stay in the know</h3>
            <p className="text-sm text-white/70 mb-4">
              Sign up for exclusive offers, style tips, and more.
            </p>
            {subscribed ? (
              <p className="text-sm text-green-300">Thanks for subscribing!</p>
            ) : (
              <form onSubmit={handleNewsletter} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field flex-1 text-[var(--color-text)]"
                  required
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  Sign Up
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-lg mb-1">{site.name}</h4>
            <p className="text-xs text-white/50 mb-3">{site.legalName}</p>
            <p className="text-sm text-white/70">{site.tagline}</p>
            <p className="text-sm text-white/70 mt-3 leading-relaxed">{site.contact.address}</p>
            <p className="text-sm text-white/70 mt-2">
              <span className="text-white/50">Contact: </span>{site.contact.person}
            </p>
            <a href={`tel:${site.contact.phone}`} className="text-sm text-white/70 hover:text-white block mt-1">
              {site.contact.phone}
            </a>
            <a href={`mailto:${site.contact.email}`} className="text-sm text-white/70 hover:text-white block mt-1">
              {site.contact.email}
            </a>
          </div>
          {navigation.footer.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/20 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {site.legalName}. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/info/terms-and-conditions" className="hover:text-white">Terms</Link>
            <Link href="/info/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link href="/info/refund-policy" className="hover:text-white">Refunds</Link>
            <Link href="/info/cancellation-policy" className="hover:text-white">Cancellation</Link>
            {site.social.instagram && (
              <a href={site.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
