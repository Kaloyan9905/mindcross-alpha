import path from "node:path";
import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

/**
 * Tests for the in-app meeting room: access gating, the room booting (acquiring
 * fake media + waiting state), and a REAL two-peer WebRTC handshake between a
 * client and the therapist. State is seeded by globalSetup (e2e/.fixtures.json).
 */

/** The e2e app is served here (see playwright.config.ts). */
const BASE_URL = "http://localhost:3100";

type Fixtures = {
  requester: { email: string; password: string; name: string };
  addressee: { email: string; password: string; name: string };
  meeting: {
    bookingId: string;
    therapistName: string;
    therapistEmail: string;
    therapistPassword: string;
  };
};

function loadFixtures(): Fixtures {
  const file = path.resolve(process.cwd(), "e2e/.fixtures.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Fixtures;
  } catch {
    throw new Error(`Missing ${file} — globalSetup (scripts/e2e-setup.ts) did not run.`);
  }
}

/** Sign in and wait until we leave /login (role decides the landing page). */
async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20_000 });
}

test.describe("meeting room", () => {
  const fx = loadFixtures();

  test("a booking participant can open the room", async ({ page }) => {
    await signIn(page, fx.requester.email, fx.requester.password);
    await page.goto(`/session/${fx.meeting.bookingId}`);

    await expect(page.getByRole("heading", { name: /session with/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /leave/i }).first()).toBeVisible();
    // No other peer is present, so the room sits in its waiting state.
    await expect(page.getByText(/waiting for/i)).toBeVisible({ timeout: 15_000 });
  });

  test("a non-participant is denied the room", async ({ page }) => {
    await signIn(page, fx.addressee.email, fx.addressee.password);
    await page.goto(`/session/${fx.meeting.bookingId}`);
    // notFound() — the room header must not render.
    await expect(page.getByRole("heading", { name: /session with/i })).toHaveCount(0);
  });

  test("client and therapist connect peer-to-peer", async ({ browser }) => {
    // Two isolated browser contexts. Pass baseURL + media permissions explicitly
    // (manually-created contexts don't inherit the project's `use`); the fake
    // camera/mic come from the browser-level launch args in the config.
    const opts = {
      baseURL: BASE_URL,
      permissions: ["camera", "microphone"],
    };
    const clientCtx = await browser.newContext(opts);
    const therapistCtx = await browser.newContext(opts);
    try {
      const client = await clientCtx.newPage();
      const therapist = await therapistCtx.newPage();

      await signIn(client, fx.requester.email, fx.requester.password);
      await signIn(therapist, fx.meeting.therapistEmail, fx.meeting.therapistPassword);

      await client.goto(`/session/${fx.meeting.bookingId}`);
      await therapist.goto(`/session/${fx.meeting.bookingId}`);

      // Each discovers the other (leaves the waiting state)...
      await expect(client.getByText(/waiting for/i)).toBeHidden({ timeout: 20_000 });
      await expect(therapist.getByText(/waiting for/i)).toBeHidden({ timeout: 20_000 });

      // ...and the WebRTC connection completes (the "Connecting to…" overlay
      // clears only once the peer connection reaches "connected").
      await expect(client.getByText(/connecting to/i)).toHaveCount(0, { timeout: 30_000 });
      await expect(therapist.getByText(/connecting to/i)).toHaveCount(0, { timeout: 30_000 });

      // In-call chat is server-backed (persists, unlike the old data channel).
      await client.getByRole("button", { name: /open chat/i }).click();
      await client.getByLabel("Chat message").fill("hello from e2e");
      await client.getByRole("button", { name: /^send$/i }).click();
      await therapist.getByRole("button", { name: /open chat/i }).click();
      await expect(therapist.getByText("hello from e2e")).toBeVisible({ timeout: 10_000 });

      // ...and it survives a refresh/rejoin (the reported bug).
      await therapist.reload();
      await therapist.getByRole("button", { name: /open chat/i }).click();
      await expect(therapist.getByText("hello from e2e")).toBeVisible({ timeout: 10_000 });
    } finally {
      await clientCtx.close();
      await therapistCtx.close();
    }
  });
});
