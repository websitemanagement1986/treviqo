"use client";

import { useState } from "react";
import { IconChevronDown } from "@/components/icons";

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left font-semibold text-sm"
      >
        {title}
        <IconChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-4 text-sm text-[var(--color-text-muted)] leading-relaxed">{children}</div>}
    </div>
  );
}

export function ProductAccordion({
  description,
  shipping,
  returns,
}: {
  description: string;
  shipping: string;
  returns: string;
}) {
  return (
    <div className="mt-8">
      <AccordionItem title="Description" defaultOpen>
        <p>{description}</p>
      </AccordionItem>
      <AccordionItem title="Shipping">
        <p>{shipping}</p>
      </AccordionItem>
      <AccordionItem title="Returns">
        <p>{returns}</p>
      </AccordionItem>
    </div>
  );
}
