import { getDisplayTags } from '@/lib/market-tags';

type MarketTagsProps = {
  tags?: string[] | null;
  className?: string;
};

export function MarketTags({ tags, className = '' }: MarketTagsProps) {
  const items = getDisplayTags(tags);
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {items.map((tag) => (
        <span
          key={tag}
          className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400/90 bg-emerald-500/10"
        >
          #{tag.replace(/^#/, '')}
        </span>
      ))}
    </div>
  );
}
