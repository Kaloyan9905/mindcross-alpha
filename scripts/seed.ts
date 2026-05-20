/**
 * Dev seed script for MindCross.
 *
 * Seeds ~10 realistic `active` therapists (each with 3-5 future availability
 * slots) and 3 pending therapist applications.
 *
 * Idempotent-ish: it TRUNCATEs `availability_slots`, `therapists` and
 * `therapist_applications` first, then re-inserts, so re-running yields a
 * clean, deterministic-shaped dataset. It does NOT touch `users` or
 * `bookings`.
 *
 *   pnpm tsx scripts/seed.ts      (or: pnpm db:seed)
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { uuidv7 } from "uuidv7";
import {
  type NewAvailabilitySlot,
  type NewTherapist,
  type NewTherapistApplication,
  availabilitySlots,
  therapistApplications,
  therapists,
} from "../src/modules/therapists/db/schema";
import { slugify } from "../src/modules/therapists/lib/slug";

// `.env` is loaded by the import above; also pick up `.env.local` (the file
// the rest of the app uses) without overriding anything already set.
loadEnv({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked .env and .env.local).");
  process.exit(1);
}

/** Future-dated slot: `dayOffset` days from now, anchored at `hour`:00 UTC. */
function futureSlot(dayOffset: number, hour: number): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date();
  startsAt.setUTCHours(hour, 0, 0, 0);
  startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // 1h sessions
  return { startsAt, endsAt };
}

type SeedTherapist = Omit<NewTherapist, "id" | "slug"> & {
  /** day offset + hour pairs for this therapist's availability slots. */
  slotPlan: ReadonlyArray<readonly [number, number]>;
};

const SEED_THERAPISTS: SeedTherapist[] = [
  {
    displayName: "Olena Kovalenko",
    email: "olena.kovalenko@example.com",
    phone: "+49 30 1111001",
    bio: "Trauma-focused psychologist supporting Ukrainian families resettling in Europe. I work in Ukrainian and Russian, with a calm, body-aware approach to processing displacement and loss.",
    yearsOfExperience: 11,
    languages: ["Ukrainian", "Russian", "English"],
    culturalBackground: ["Ukrainian", "Eastern European"],
    specializations: ["trauma", "grief", "anxiety"],
    migrationExperience: true,
    gender: "female",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/aaa-bbbb-ccc",
    photoUrl: "https://i.pravatar.cc/400?img=47",
    status: "active",
    slotPlan: [
      [2, 9],
      [3, 13],
      [5, 10],
      [7, 15],
    ],
  },
  {
    displayName: "Dmytro Shevchenko",
    email: "dmytro.shevchenko@example.com",
    phone: "+48 22 1111002",
    bio: "Clinical therapist specialising in anxiety and depression among displaced adults. Sessions are practical and goal-oriented, drawing on CBT, offered in Ukrainian and Polish.",
    yearsOfExperience: 8,
    languages: ["Ukrainian", "Polish", "English"],
    culturalBackground: ["Ukrainian"],
    specializations: ["anxiety", "depression"],
    migrationExperience: true,
    gender: "male",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/ddd-eeee-fff",
    photoUrl: "https://i.pravatar.cc/400?img=12",
    status: "active",
    slotPlan: [
      [1, 11],
      [4, 14],
      [6, 9],
    ],
  },
  {
    displayName: "Layla Haddad",
    email: "layla.haddad@example.com",
    phone: "+49 89 1111003",
    bio: "Arabic-speaking family therapist with refugee communities. I help parents and children rebuild trust and routine after upheaval, holding space for both grief and hope.",
    yearsOfExperience: 14,
    languages: ["Arabic", "English"],
    culturalBackground: ["Syrian", "Middle Eastern"],
    specializations: ["family therapy", "trauma", "grief"],
    migrationExperience: true,
    gender: "female",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/ggg-hhhh-iii",
    photoUrl: "https://i.pravatar.cc/400?img=45",
    status: "active",
    slotPlan: [
      [2, 12],
      [3, 16],
      [5, 11],
      [8, 13],
      [9, 10],
    ],
  },
  {
    displayName: "Karim Nasser",
    email: "karim.nasser@example.com",
    phone: "+44 20 1111004",
    bio: "Counsellor working with young men navigating identity, isolation and the pressure of starting over abroad. Direct, warm sessions in Arabic and English.",
    yearsOfExperience: 6,
    languages: ["Arabic", "English"],
    culturalBackground: ["Lebanese", "Middle Eastern"],
    specializations: ["anxiety", "depression"],
    migrationExperience: false,
    gender: "male",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/jjj-kkkk-lll",
    photoUrl: "https://i.pravatar.cc/400?img=14",
    status: "active",
    slotPlan: [
      [1, 17],
      [4, 9],
      [6, 14],
    ],
  },
  {
    displayName: "Magdalena Wojcik",
    email: "magdalena.wojcik@example.com",
    phone: "+48 12 1111005",
    bio: "Polish and English-speaking psychotherapist focused on grief and life transitions. I support international students and workers adjusting to a new country and culture.",
    yearsOfExperience: 9,
    languages: ["Polish", "English"],
    culturalBackground: ["Polish", "Central European"],
    specializations: ["grief", "anxiety", "depression"],
    migrationExperience: true,
    gender: "female",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/mmm-nnnn-ooo",
    photoUrl: "https://i.pravatar.cc/400?img=32",
    status: "active",
    slotPlan: [
      [2, 10],
      [3, 15],
      [7, 11],
      [10, 9],
    ],
  },
  {
    displayName: "Sofia Marquez",
    email: "sofia.marquez@example.com",
    phone: "+34 91 1111006",
    bio: "Bilingual Spanish/English therapist specialising in family therapy and trauma. I work with Latin American migrant families on belonging, parenting and intergenerational healing.",
    yearsOfExperience: 12,
    languages: ["Spanish", "English"],
    culturalBackground: ["Mexican", "Latin American"],
    specializations: ["family therapy", "trauma"],
    migrationExperience: true,
    gender: "female",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/ppp-qqqq-rrr",
    photoUrl: "https://i.pravatar.cc/400?img=44",
    status: "active",
    slotPlan: [
      [1, 13],
      [4, 16],
      [6, 10],
      [8, 14],
    ],
  },
  {
    displayName: "Diego Fernandez",
    email: "diego.fernandez@example.com",
    phone: "+34 93 1111007",
    bio: "Spanish-speaking clinical psychologist treating anxiety and depression. Sessions blend mindfulness and CBT to help newcomers manage uncertainty and rebuild confidence.",
    yearsOfExperience: 7,
    languages: ["Spanish", "English"],
    culturalBackground: ["Spanish", "Latin American"],
    specializations: ["anxiety", "depression"],
    migrationExperience: false,
    gender: "male",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/sss-tttt-uuu",
    photoUrl: "https://i.pravatar.cc/400?img=15",
    status: "active",
    slotPlan: [
      [2, 9],
      [5, 13],
      [9, 11],
    ],
  },
  {
    displayName: "Anna Petrova",
    email: "anna.petrova@example.com",
    phone: "+49 40 1111008",
    bio: "Russian and English-speaking trauma therapist. I support refugees and asylum seekers through grief, PTSD and the long process of feeling safe again in a new home.",
    yearsOfExperience: 15,
    languages: ["Russian", "English"],
    culturalBackground: ["Russian", "Eastern European"],
    specializations: ["trauma", "grief"],
    migrationExperience: true,
    gender: "female",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/vvv-wwww-xxx",
    photoUrl: "https://i.pravatar.cc/400?img=49",
    status: "active",
    slotPlan: [
      [1, 10],
      [3, 14],
      [6, 16],
      [8, 9],
      [11, 13],
    ],
  },
  {
    displayName: "James Whitfield",
    email: "james.whitfield@example.com",
    phone: "+44 161 1111009",
    bio: "English-speaking counsellor for international students facing anxiety, homesickness and academic stress. Friendly, down-to-earth sessions to help you settle and thrive.",
    yearsOfExperience: 5,
    languages: ["English"],
    culturalBackground: ["British"],
    specializations: ["anxiety", "depression"],
    migrationExperience: false,
    gender: "male",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/yyy-zzzz-aaa",
    photoUrl: "https://i.pravatar.cc/400?img=11",
    status: "active",
    slotPlan: [
      [2, 11],
      [4, 15],
      [7, 9],
    ],
  },
  {
    displayName: "Yuliia Boiko",
    email: "yuliia.boiko@example.com",
    phone: "+49 69 1111010",
    bio: "Family therapist working in Ukrainian, Russian and English. I help couples and parents stay connected under the strain of relocation, separation and uncertain futures.",
    yearsOfExperience: 10,
    languages: ["Ukrainian", "Russian", "English"],
    culturalBackground: ["Ukrainian", "Eastern European"],
    specializations: ["family therapy", "anxiety", "grief"],
    migrationExperience: true,
    gender: "non_binary",
    pricePerSessionCents: 0,
    currency: "EUR",
    sessionUrl: "https://meet.google.com/bbb-cccc-ddd",
    photoUrl: "https://i.pravatar.cc/400?img=20",
    status: "active",
    slotPlan: [
      [1, 12],
      [3, 16],
      [5, 10],
      [9, 14],
    ],
  },
];

const SEED_APPLICATIONS: Array<Omit<NewTherapistApplication, "id">> = [
  {
    fullName: "Iryna Melnyk",
    email: "iryna.melnyk@example.com",
    phone: "+49 30 2222001",
    country: "Germany",
    languages: ["Ukrainian", "English"],
    specializations: ["trauma", "anxiety"],
    yearsOfExperience: 9,
    shortBio:
      "Trauma-informed psychologist relocated from Kyiv. Keen to support Ukrainian refugees through MindCross and continue my clinical work in a new country.",
    status: "pending",
  },
  {
    fullName: "Omar Khalil",
    email: "omar.khalil@example.com",
    phone: "+44 20 2222002",
    country: "United Kingdom",
    languages: ["Arabic", "English"],
    specializations: ["family therapy", "depression"],
    yearsOfExperience: 13,
    shortBio:
      "Family therapist with over a decade of experience across the Middle East. I want to help refugee families rebuild stability and connection.",
    status: "pending",
  },
  {
    fullName: "Carla Jimenez",
    email: "carla.jimenez@example.com",
    phone: "+34 91 2222003",
    country: "Spain",
    languages: ["Spanish", "English"],
    specializations: ["grief", "anxiety"],
    yearsOfExperience: 6,
    shortBio:
      "Counsellor focused on grief and adjustment. I would love to support Spanish-speaking migrants and international students finding their footing abroad.",
    status: "pending",
  },
];

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema: { therapists, availabilitySlots, therapistApplications } });

  try {
    console.log("Clearing therapist, availability and application tables...");
    // RESTART IDENTITY is a no-op here (text PKs) but CASCADE clears any
    // dependent rows; bookings reference therapists so we cascade defensively.
    await db.execute(
      sql`TRUNCATE TABLE ${availabilitySlots}, ${therapistApplications}, ${therapists} RESTART IDENTITY CASCADE`,
    );

    const now = new Date();
    const therapistRows: NewTherapist[] = [];
    const slotRows: NewAvailabilitySlot[] = [];
    const usedSlugs = new Set<string>();

    for (const t of SEED_THERAPISTS) {
      const { slotPlan, ...profile } = t;
      const id = uuidv7();

      // Generate a unique slug in-memory (table is empty post-truncate).
      let slug = slugify(profile.displayName);
      let n = 1;
      while (usedSlugs.has(slug)) {
        n += 1;
        slug = `${slugify(profile.displayName)}-${n}`;
      }
      usedSlugs.add(slug);

      therapistRows.push({
        ...profile,
        id,
        slug,
        createdAt: now,
        updatedAt: now,
      });

      for (const [dayOffset, hour] of slotPlan) {
        const { startsAt, endsAt } = futureSlot(dayOffset, hour);
        slotRows.push({
          id: uuidv7(),
          therapistId: id,
          startsAt,
          endsAt,
          isBooked: false,
          createdAt: now,
        });
      }
    }

    await db.insert(therapists).values(therapistRows);
    console.log(`Inserted ${therapistRows.length} therapists.`);

    await db.insert(availabilitySlots).values(slotRows);
    console.log(`Inserted ${slotRows.length} availability slots.`);

    const applicationRows: NewTherapistApplication[] = SEED_APPLICATIONS.map(
      (a) => ({ ...a, id: uuidv7(), submittedAt: now }),
    );
    await db.insert(therapistApplications).values(applicationRows);
    console.log(`Inserted ${applicationRows.length} therapist applications.`);

    console.log("Seed complete.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
