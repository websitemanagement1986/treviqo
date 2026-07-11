import Link from "next/link";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="text-sm text-[var(--color-text-muted)] mb-6" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-[var(--color-primary)]">
              {item.label}
            </Link>
          ) : (
            <span className="text-[var(--color-text)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
