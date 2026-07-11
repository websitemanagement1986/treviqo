"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HeroSlide } from "@/lib/types";
import { assetUrl } from "@/lib/format";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? slides.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === slides.length - 1 ? 0 : c + 1));

  const slide = slides[current];

  return (
    <section className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden bg-gray-900">
      <Image
        src={assetUrl(slide.image)}
        alt={slide.title}
        fill
        className="object-cover opacity-70"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-7xl px-4 w-full">
          <div className="max-w-lg text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">{slide.title}</h2>
            <p className="text-lg sm:text-xl mb-6 text-white/90">{slide.subtitle}</p>
            <Link href={slide.href} className="btn-primary text-base">
              {slide.cta}
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
            aria-label="Previous slide"
          >
            <IconChevronLeft />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
            aria-label="Next slide"
          >
            <IconChevronRight />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
