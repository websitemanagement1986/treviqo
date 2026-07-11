import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-loader";
import { PolicyPage } from "@/components/pages/PolicyPage";

const PAGE_SLUGS = [
  "about-us",
  "terms-and-conditions",
  "privacy-policy",
  "refund-policy",
  "cancellation-policy",
] as const;

export function generateStaticParams() {
  return PAGE_SLUGS.map((slug) => ({ slug }));
}

export default async function InfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = getSiteConfig();
  const page = config.pages[slug];

  if (!page) notFound();

  return <PolicyPage page={page} />;
}
