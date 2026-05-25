import { NO_COLOR, YES_COLOR } from '@/lib/categories';

const R = 23;
const C = 2 * Math.PI * R;

type MarketOddsGaugeProps = {
  yesPercent: number;
  noPercent: number;
};

export function MarketOddsGauge({ yesPercent, noPercent }: MarketOddsGaugeProps) {
  const yesLen = (yesPercent / 100) * C;
  const noLen = (noPercent / 100) * C;

  return (
    <div className="shrink-0 w-14 h-14 relative">
      <svg width="56" height="56" viewBox="0 0 56 56" className="block">
        <g transform="rotate(-90 28 28)">
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="5"
          />
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={YES_COLOR}
            strokeWidth="5"
            strokeDasharray={`${yesLen} ${C}`}
            strokeLinecap="round"
          />
          <circle
            cx="28"
            cy="28"
            r={R}
            fill="none"
            stroke={NO_COLOR}
            strokeWidth="5"
            strokeDasharray={`${noLen} ${C}`}
            strokeDashoffset={-yesLen}
            strokeLinecap="round"
          />
        </g>
        <text
          x="28"
          y="26"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
        >
          {yesPercent}%
        </text>
        <text x="28" y="40" textAnchor="middle" fill="#9ca3af" fontSize="10">
          NO {noPercent}%
        </text>
      </svg>
    </div>
  );
}
