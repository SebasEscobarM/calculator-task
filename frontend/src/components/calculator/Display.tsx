interface DisplayProps {
  /** Number on the main line. */
  value: string;
  /** Secondary line, such as "12 +" or "12 + 5 =". */
  expression: string;
  /** Replaces the value when the last calculation failed. */
  error: string | null;
  /** A calculation is waiting for the API. */
  busy: boolean;
}

export function Display({ value, expression, error, busy }: DisplayProps) {
  return (
    <section
      aria-label="Display"
      aria-busy={busy}
      className="@container flex min-h-32 flex-col justify-between gap-2 rounded-2xl bg-platinum px-5 py-4 text-charcoal-blue"
    >
      <div className="flex min-h-7 items-center justify-between gap-3 text-lg">
        {busy ? <span className="animate-appear-delayed text-base">Calculating…</span> : <span />}
        <span className="truncate tabular-nums">{expression}</span>
      </div>
      {error ? (
        <p role="alert" className="text-right text-2xl font-semibold">
          {error}
        </p>
      ) : (
        <output
          className="block text-right leading-tight font-semibold tracking-tight whitespace-nowrap tabular-nums"
          style={{ fontSize: fittingFontSize(value) }}
        >
          {value}
        </output>
      )}
    </section>
  );
}

/**
 * Sizes the value to fit the display's width (a character is at most about
 * 0.6em wide), capped at 3rem so short numbers don't get huge.
 */
function fittingFontSize(text: string): string {
  const width = (100 / (0.6 * Math.max(text.length, 8))).toFixed(2);
  return `min(3rem, ${width}cqi)`;
}
