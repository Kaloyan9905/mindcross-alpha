import { cn } from "@/lib/utils";

/**
 * Soft, on-brand line illustrations for empty states — warmer than a bare icon
 * for an audience that may feel anxious seeing "nothing here". Theme-aware
 * (uses design tokens, so it adapts to dark mode) and decorative
 * (`aria-hidden`); always pair with a text message.
 */
export type EmptyIllustrationName =
  | "calendar"
  | "chat"
  | "friends"
  | "search"
  | "clock";

function Sparkles() {
  return (
    <>
      <circle cx="26" cy="34" r="3" className="fill-accent-foreground/40" />
      <circle cx="98" cy="44" r="2.5" className="fill-primary/40" />
      <circle cx="92" cy="92" r="3" className="fill-accent-foreground/30" />
      <circle cx="30" cy="92" r="2" className="fill-primary/30" />
    </>
  );
}

const GLYPHS: Record<EmptyIllustrationName, React.ReactNode> = {
  calendar: (
    <>
      <rect x="38" y="42" width="44" height="40" rx="8" className="fill-card stroke-primary" strokeWidth="3" />
      <path d="M38 54 H82" className="stroke-primary" strokeWidth="3" />
      <path d="M50 36 V46 M70 36 V46" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      <path d="M52 66 l5 5 l11 -12" className="stroke-success" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  chat: (
    <>
      <rect x="30" y="40" width="42" height="30" rx="9" className="fill-card stroke-primary" strokeWidth="3" />
      <path d="M42 70 v8 l10 -8" className="fill-card stroke-primary" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 52 H62 M40 59 H56" className="stroke-primary/60" strokeWidth="3" strokeLinecap="round" />
      <rect x="62" y="58" width="30" height="22" rx="8" className="fill-accent stroke-success" strokeWidth="3" />
      <path d="M84 80 v6 l-8 -6" className="fill-accent stroke-success" strokeWidth="3" strokeLinejoin="round" />
    </>
  ),
  friends: (
    <>
      <circle cx="48" cy="52" r="11" className="fill-card stroke-primary" strokeWidth="3" />
      <path d="M30 84 a18 18 0 0 1 36 0" className="fill-card stroke-primary" strokeWidth="3" strokeLinecap="round" />
      <circle cx="76" cy="56" r="9" className="fill-accent stroke-success" strokeWidth="3" />
      <path d="M62 84 a16 16 0 0 1 30 0" className="fill-accent stroke-success" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="55" cy="55" r="19" className="fill-card stroke-primary" strokeWidth="3" />
      <path d="M55 47 a8 8 0 0 0 -8 8" className="stroke-primary/50" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M69 69 L84 84" className="stroke-primary" strokeWidth="4.5" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="60" cy="60" r="24" className="fill-card stroke-primary" strokeWidth="3" />
      <path d="M60 46 V60 l10 7" className="stroke-primary" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function EmptyIllustration({
  name,
  className,
}: {
  name: EmptyIllustrationName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-hidden="true"
      className={cn("h-24 w-24", className)}
    >
      <circle cx="60" cy="60" r="50" className="fill-secondary/70" />
      <Sparkles />
      {GLYPHS[name]}
    </svg>
  );
}
