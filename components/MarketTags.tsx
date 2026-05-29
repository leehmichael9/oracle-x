import { getDisplayTags } from '@/lib/market-tags';

type MarketTagsProps = {
  tags?: string[] | null;
  className?: string;
};

export function MarketTags({ tags, className = '' }: MarketTagsProps) {
  const items = getDisplayTags(tags);
  if (items.length === 0) return null;

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      {items.map((tag) => (
        <span
          key={tag}
          className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
        >
          #{tag.replace(/^#/, '')}
        </span>
      ))}
    </div>
  );
}
