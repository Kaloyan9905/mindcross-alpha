/**
 * Crisis helplines by region. A curated starting point for an audience that may
 * be far from home and unsure who to call. These are widely published numbers,
 * but they are a STARTING POINT — the UI always tells people to call their local
 * emergency number if they are in immediate danger.
 *
 * Pure data (no network) — keeping with the no-external-services constraint.
 */
export interface CrisisLine {
  name: string;
  number: string;
  hours?: string;
  note?: string;
}

export interface CrisisRegion {
  code: string;
  label: string;
  lines: CrisisLine[];
}

/** Shown for every region. */
export const UNIVERSAL_LINES: CrisisLine[] = [
  {
    name: "International helpline finder",
    number: "findahelpline.com",
    note: "Find a free, confidential helpline in your country and language.",
  },
  {
    name: "Befrienders Worldwide",
    number: "befrienders.org",
    note: "Emotional support centres around the world.",
  },
];

export const CRISIS_REGIONS: CrisisRegion[] = [
  {
    code: "eu",
    label: "European Union",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      {
        name: "EU child helpline",
        number: "116 111",
        note: "For children & young people (most EU countries).",
      },
    ],
  },
  {
    code: "de",
    label: "Germany",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      { name: "Telefonseelsorge", number: "0800 111 0 111", hours: "24/7" },
    ],
  },
  {
    code: "ua",
    label: "Ukraine",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      { name: "Lifeline Ukraine", number: "7333", hours: "24/7" },
    ],
  },
  {
    code: "pl",
    label: "Poland",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      { name: "Crisis helpline", number: "116 123", hours: "24/7" },
    ],
  },
  {
    code: "fr",
    label: "France",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      {
        name: "National suicide prevention",
        number: "3114",
        hours: "24/7",
      },
    ],
  },
  {
    code: "es",
    label: "Spain",
    lines: [
      { name: "Emergency services", number: "112", hours: "24/7" },
      { name: "Suicide support line", number: "024", hours: "24/7" },
    ],
  },
  {
    code: "uk",
    label: "United Kingdom",
    lines: [
      { name: "Emergency services", number: "999", hours: "24/7" },
      { name: "Samaritans", number: "116 123", hours: "24/7" },
    ],
  },
  {
    code: "us",
    label: "United States",
    lines: [
      { name: "Emergency services", number: "911", hours: "24/7" },
      {
        name: "988 Suicide & Crisis Lifeline",
        number: "988",
        hours: "24/7",
        note: "Call or text.",
      },
    ],
  },
];

export function regionByCode(code: string): CrisisRegion | undefined {
  return CRISIS_REGIONS.find((r) => r.code === code);
}
