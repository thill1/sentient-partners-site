/** The Relai mark: an R whose leg hands off to a dot. Decorative; the name sits beside it. */
export function RelaiMark({ size = 64, ink = "#ffffff", signal = "#f26b1d" }: { size?: number; ink?: string; signal?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M30 20V80M30 20H54A19 19 0 0 1 54 58H30M50 58L64 76"
        stroke={ink}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="76" cy="88" r="7.5" fill={signal} />
    </svg>
  );
}

export function RelaiWordmark({ size = 40 }: { size?: number }) {
  return (
    <span className="relai-wordmark" style={{ fontSize: size }}>
      Rel<span>ai</span>
    </span>
  );
}
