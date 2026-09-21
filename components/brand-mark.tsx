export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 120 120" role="presentation">
        <rect x="8" y="9" width="104" height="104" rx="30" fill="#20201d" />
        <rect x="5" y="5" width="104" height="104" rx="30" fill="#ff6b45" />
        <path d="M25 70V35c0-7 8-10 12-4l15 25 15-25c4-6 12-3 12 4v20c0 10 5 15 14 15" fill="none" stroke="#fffaf3" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="95" cy="70" r="5" fill="#20201d" />
        <rect x="15" y="83" width="84" height="17" rx="8.5" fill="#20201d" />
        <text x="57" y="95" textAnchor="middle" fill="#fffaf3" fontFamily="Arial, sans-serif" fontSize="9.5" fontWeight="700" letterSpacing="0.65">MONOLOGUE</text>
      </svg>
    </span>
  );
}
