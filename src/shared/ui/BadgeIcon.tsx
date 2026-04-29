export function BadgeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
      role="img"
    >
      <path
        d="M32 4l8.5 6.2L51 8l1 10.6 9.5 4.7L57 32l4.5 8.7L52 45.4 51 56l-10.5-2.2L32 60l-8.5-6.2L13 56l-1-10.6L2.5 40.7 7 32 2.5 23.3 12 18.6 13 8l10.5 2.2L32 4z"
        fill="#D4A745"
        stroke="#1B2A4E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fontFamily="serif"
        fontWeight="700"
        fontSize="14"
        fill="#1B2A4E"
      >
        PD
      </text>
    </svg>
  );
}
