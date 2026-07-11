import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getSiteConfig } from "@/lib/site-loader";
import { ContactForm } from "@/components/pages/ContactForm";

export default function ContactUsPage() {
  const { site } = getSiteConfig();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Contact Us" }]} />
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-[var(--color-accent)]">Contact Us</h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        We&apos;d love to hear from you. Reach out for orders, returns, or general enquiries.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="bg-[var(--color-surface)] rounded-sm p-6 space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Company</h2>
            <p className="font-semibold text-[var(--color-accent)]">{site.legalName}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Contact Person</h2>
            <p className="font-semibold">{site.contact.person}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Phone</h2>
            <a href={`tel:${site.contact.phone}`} className="text-[var(--color-primary)] font-semibold hover:underline">
              {site.contact.phone}
            </a>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Email</h2>
            <a href={`mailto:${site.contact.email}`} className="text-[var(--color-primary)] hover:underline">
              {site.contact.email}
            </a>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Address</h2>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{site.contact.address}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">Business Hours</h2>
            <p className="text-sm text-[var(--color-text-muted)]">Monday – Saturday, 10:00 AM – 6:00 PM IST</p>
          </div>
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
