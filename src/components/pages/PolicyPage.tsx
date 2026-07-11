import Link from "next/link";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import type { PageContent } from "@/lib/types";

export function PolicyPage({ page }: { page: PageContent }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: page.title }]} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-[var(--color-accent)]">{page.title}</h1>
      <div className="space-y-6 text-sm leading-relaxed text-[var(--color-text)]">
        {page.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2 className="text-base font-bold mb-2 text-[var(--color-accent)]">{section.heading}</h2>
            )}
            <p className="text-[var(--color-text-muted)]">{section.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 pt-6 border-t border-gray-200">
        <Link href="/contact-us" className="text-sm text-[var(--color-primary)] hover:underline font-semibold">
          Have questions? Contact us →
        </Link>
      </div>
    </div>
  );
}
