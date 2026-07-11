import { IconStar } from "@/components/icons";

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <IconStar
          key={i}
          className={`w-3 h-3 ${i < Math.round(rating) ? "text-yellow-400" : "text-gray-300"}`}
          filled={i < Math.round(rating)}
        />
      ))}
      {count !== undefined && (
        <span className="text-xs text-[var(--color-text-muted)] ml-1">({count})</span>
      )}
    </div>
  );
}
