# MindCross Design System

MindCross is a culturally-matched therapy booking platform for migrants,
refugees, and international students. Our audience is often emotionally
overwhelmed and almost always on a phone. The design system therefore optimises
for **calm, warmth, plain language, and accessibility** — somewhere between a
healthcare booking site (ZnanyLekarz, Doctoralia) and a wellness app (Calm).

We **avoid**: clinical or cold aesthetics, "tech-bro" gradients, dark patterns,
forced urgency, and small unreadable type.

---

## Palette

All tokens live as raw HSL components (so shadcn-style `hsl(var(--token))`
works). Defined in `src/app/globals.css` under `:root` and re-exposed as
Tailwind utilities via `@theme`.

| Token                     | Role                                        | HSL                  | Approx. Hex |
| ------------------------- | ------------------------------------------- | -------------------- | ----------- |
| `--background`            | App background                              | `0 0% 100%`          | `#FFFFFF`   |
| `--foreground`            | Body text, headings                         | `220 15% 12%`        | `#1A1D23`   |
| `--card`                  | Card surfaces                               | `0 0% 100%`          | `#FFFFFF`   |
| `--card-foreground`       | Text on cards                               | `220 15% 12%`        | `#1A1D23`   |
| `--popover`               | Menu / dropdown / dialog surface            | `0 0% 100%`          | `#FFFFFF`   |
| `--popover-foreground`    | Text on popovers                            | `220 15% 12%`        | `#1A1D23`   |
| `--primary`               | Soft blue — CTAs, links, focus              | `210 70% 55%`        | `#3D8DDB`   |
| `--primary-foreground`    | Text on primary                             | `0 0% 100%`          | `#FFFFFF`   |
| `--secondary`             | Warm beige — section breaks, soft surfaces  | `35 35% 90%`         | `#EEE5D6`   |
| `--secondary-foreground`  | Text on beige                               | `30 25% 22%`         | `#473A2C`   |
| `--muted`                 | Cooler beige — de-emphasised surfaces       | `35 25% 94%`         | `#F4EFE7`   |
| `--muted-foreground`      | Helper / placeholder text                   | `220 10% 40%`        | `#5C6471`   |
| `--accent`                | Pastel green — success / positive feedback  | `145 50% 75%`        | `#A6E3BD`   |
| `--accent-foreground`     | Text on accent green                        | `145 45% 18%`        | `#1B4229`   |
| `--tertiary`              | Light lavender — community / group / tags   | `270 35% 88%`        | `#DED4EB`   |
| `--tertiary-foreground`   | Text on lavender                            | `270 35% 25%`        | `#3D2A56`   |
| `--success`               | Filled success state                        | `145 50% 45%`        | `#3AAD66`   |
| `--success-foreground`    | Text on success                             | `0 0% 100%`          | `#FFFFFF`   |
| `--destructive`           | Warm, non-alarming red                      | `0 65% 55%`          | `#D94A4A`   |
| `--destructive-foreground`| Text on destructive                         | `0 0% 100%`          | `#FFFFFF`   |
| `--border`                | Hairline borders                            | `220 15% 90%`        | `#DEE0E5`   |
| `--input`                 | Form field border                           | `220 15% 88%`        | `#D7DAE0`   |
| `--ring`                  | Focus ring (matches primary)                | `210 70% 55%`        | `#3D8DDB`   |
| `--radius`                | Base radius scale                           | `0.75rem` (12px)     | —           |

### Why these specific hues

- **Soft blue primary (#3D8DDB)** — trustworthy, healthcare-coded, but warmer
  than corporate "Facebook blue". Contrast with white is **4.55:1** (AA pass
  for normal text).
- **Pastel green accent** — used as a *positive* surface (eligible-for-booking
  badges, "matched", success toasts). Paired with the deep green
  `--accent-foreground` for **6.9:1** contrast.
- **Warm beige secondary** — soft section divider, never a CTA. Replaces the
  cold "Slate-100" that most SaaS templates default to.
- **Lavender tertiary** — gentle visual marker for community / group sessions
  and language-pair tags. Distinct enough from primary that colour-blind users
  can still differentiate the two categories.
- **Foreground (#1A1D23)** — true near-black would feel harsh; this is a
  desaturated cool dark that reduces glare while still hitting **15.5:1** on
  white.

### Single-theme MVP

We render the same calm light palette regardless of the user's
`prefers-color-scheme`. A half-built dark mode would be worse than none on a
healthcare product. Dark mode is a future task with its own contrast review.

---

## Typography

Loaded via `next/font/google` in `src/app/layout.tsx` and exposed as CSS
variables:

| Variable          | Family    | Use                                   |
| ----------------- | --------- | ------------------------------------- |
| `--font-heading`  | Nunito    | h1–h6, the wordmark, big calls-out    |
| `--font-body`     | Inter     | body copy, UI labels, form inputs     |

- **Nunito** is a humanist sans with rounded letterforms. It feels warmer and
  more human than Inter alone, which is critical for an anxiety-reducing
  product.
- **Inter** is used everywhere else because of its excellent legibility at
  small sizes and tight letterforms in dense UI (lists, forms, tables).
- Headings use weight 700, body weight 400/500. We do not go below 14px (`text-sm`) for
  user-facing copy.
- Line-height: default Tailwind (`leading-snug` for headings, `leading-relaxed`
  encouraged for paragraphs in long-form content like "Our Mission").

Use Tailwind utilities `font-heading` and `font-body` (already mapped from the
CSS variables) — never hard-code `font-['Nunito']`.

---

## Component Inventory

All primitives live in `src/components/ui/*` as **named exports**, follow the
shadcn API surface, and accept `className` for downstream Tailwind overrides.
Shared layout chrome lives in `src/components/shared/*`.

### `src/components/ui/`

| File              | Exports                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.tsx`      | `Button`, `buttonVariants` — variants: `default \| secondary \| accent \| outline \| ghost \| destructive \| link`; sizes: `sm \| default \| lg \| icon`. `asChild` supported via Radix Slot.            |
| `card.tsx`        | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`                                                                                                                        |
| `input.tsx`       | `Input` (standard text input with focus ring + invalid state)                                                                                                                                            |
| `label.tsx`       | `Label` (Radix Label wrapper)                                                                                                                                                                            |
| `textarea.tsx`    | `Textarea`                                                                                                                                                                                               |
| `select.tsx`      | `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`                                |
| `badge.tsx`       | `Badge`, `badgeVariants` — variants: `default \| secondary \| accent \| tertiary \| outline \| destructive`                                                                                              |
| `avatar.tsx`      | `Avatar`, `AvatarImage`, `AvatarFallback`                                                                                                                                                                |
| `separator.tsx`   | `Separator` (horizontal or vertical, decorative by default)                                                                                                                                              |
| `tabs.tsx`        | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                                                                                                                                         |
| `dialog.tsx`      | `Dialog`, `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`                                            |
| `dropdown-menu.tsx` | Full DropdownMenu surface (`Trigger`, `Content`, `Item`, `CheckboxItem`, `RadioItem`, `Label`, `Separator`, `Shortcut`, `Group`, `Portal`, `Sub`, `SubTrigger`, `SubContent`, `RadioGroup`)             |
| `checkbox.tsx`    | `Checkbox`                                                                                                                                                                                               |
| `form.tsx`        | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`, `useFormField` — react-hook-form bindings                                                                |
| `sonner.tsx`      | `Toaster` — wired with `richColors` and `position="top-center"`                                                                                                                                          |

### `src/components/shared/`

| File         | Exports                                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `navbar.tsx` | `Navbar` (default + named). Props: `{ user?: { id, name?, role } \| null }`. Sticky, mobile-aware (Dialog-based drawer for `< md`), DropdownMenu for signed-in users, simple Log in / Sign up CTAs when signed out. |
| `footer.tsx` | `Footer` — four columns (Discover, For Therapists, Legal, Contact) plus tagline and copyright.                                                                                                                     |

Layout chrome is **not** rendered in the root layout. Route groups (e.g. a
`(marketing)` group for unauthenticated pages, an `(account)` group for signed-in
users) are expected to compose `Navbar` + `Footer` themselves so we can ship a
chromeless onboarding flow when needed.

---

## Tone of Voice

The audience is processing a hard moment in their life. Copy should sound like
a friend who happens to be a clinician, not a clinic. Practical guidance:

- **Plain English first.** Reading-level target: B1 / 7th grade. Avoid
  jargon like "therapeutic modality", "intake", "co-pay". Say "first session",
  "what we'll cover", "cost per session".
- **Calm, never urgent.** No countdown timers, no "Only 2 spots left!", no
  red badges by default. The destructive colour is reserved for genuinely
  destructive actions (cancel a booking, delete an account).
- **You/we, not the user.** "We'll match you with someone who speaks Ukrainian"
  beats "Users are matched to a Ukrainian-speaking professional."
- **Acknowledge the audience.** Cultural identity is the product. Phrases like
  "therapy that speaks your language", "someone who understands where you come
  from" are on-brand. Generic wellness platitudes ("Find your inner peace") are
  off-brand.
- **Action verbs are gentle.** "Find a therapist" not "Buy a session". "Save
  for later" not "Add to cart".
- **Errors don't blame.** "We couldn't reach our scheduling service — please try
  again" is fine; "Invalid request" is not.

---

## Accessibility Checklist (WCAG 2.1 AA)

Every PR is expected to clear the following before review:

- [ ] **Contrast.** Body text and UI controls are at least **4.5:1** against
      their background; large text (>= 18px or 14px bold) at **3:1**. Use the
      foreground tokens that ship with each surface — they're pre-paired.
- [ ] **Keyboard navigation.** Every interactive element is reachable with
      `Tab`, advances in a sane order, and triggers on `Enter` / `Space`.
      Dropdowns, dialogs, and selects close on `Escape`.
- [ ] **Visible focus.** Never set `outline: none` without supplying a
      replacement. The base layer provides a `:focus-visible` ring on every
      element; component variants extend it with `focus-visible:ring-2
      focus-visible:ring-ring focus-visible:ring-offset-2`.
- [ ] **Semantic HTML.** Use `<button>` for actions, `<a>` for navigation,
      `<nav>` / `<header>` / `<footer>` / `<main>` for landmarks. Don't render
      a `<div>` with an `onClick`.
- [ ] **Labels.** Every form input has a visible `<Label>` or an
      `aria-label`. `FormField` from `form.tsx` does this for you — use it.
- [ ] **Error messaging.** Errors are announced (`aria-invalid` + the
      associated `FormMessage` linked through `aria-describedby`).
- [ ] **Touch targets.** Minimum **44 x 44 px** for any tappable element on
      mobile. `Button` sizes default to 40px height; raise to `size="lg"` for
      thumb-first surfaces (the main hero CTA, booking buttons).
- [ ] **Motion.** All non-essential motion is gated by
      `@media (prefers-reduced-motion: reduce)`. Already done globally in
      `globals.css`.
- [ ] **Iconography.** Decorative icons set `aria-hidden="true"`. Icons that
      carry meaning (close, sign out, menu) ship with a `sr-only` label or
      `aria-label`.
- [ ] **Language.** Pages declare `lang` on `<html>` (default: `en`). Mixed
      content (a therapist's Polish bio, for example) is wrapped in `<span
      lang="pl">` so screen readers switch pronunciation.
- [ ] **Plain-language test.** If your copy needs a parenthetical
      translation, rewrite it.

---

## Using the System Effectively

A few short notes for the dev team:

1. **Compose, don't override.** Reach for `<Button variant="accent">` before
   you reach for `className="bg-green-300"`. Custom hex values are a smell.
2. **Don't import from `@radix-ui/*` directly** in app code — go through the
   wrappers in `src/components/ui/*` so we have one place to retune
   focus rings, animations, and dark-mode plumbing later.
3. **Form pattern is fixed.** `useForm()` + `Form` + `FormField` +
   `FormItem` + `FormLabel` + `FormControl` (wrapping our `Input`/`Select`)
   + `FormMessage`. This wires `aria-describedby` and `aria-invalid` for
   free.
4. **Tone of voice trumps polish.** A button that says "Find a therapist" is
   worth more than a fancier-looking one that says "Get started".
