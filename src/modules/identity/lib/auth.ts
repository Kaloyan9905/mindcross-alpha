import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  type UserRole,
} from "@/modules/identity/db/schema";
import { verifyPassword } from "@/modules/identity/lib/password";
import { loginSchema } from "@/modules/identity/lib/validators";

/**
 * Module augmentation: teach Auth.js that our `session.user` carries the
 * MindCross `id` and `role`. The `callbacks.session` below populates these
 * from the database row on every session read.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: UserRole;
  }
}

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Auth.js v5 configuration for MindCross.
 *
 * - JWT session strategy: Auth.js v5 only supports the Credentials provider
 *   with the JWT strategy — the `database` strategy returns HTTP 500 on
 *   credential sign-in (`UnsupportedStrategy`). Tradeoff: sessions are
 *   stateless and cannot be revoked server-side before their 14-day expiry.
 *   Acceptable for the MVP; revisit (short-lived tokens + a `securityStamp`
 *   check, or an OAuth-only database strategy) if instant revocation becomes
 *   a hard requirement.
 * - Credentials provider: email + password, hashed with argon2id.
 * - The DrizzleAdapter is passed our four identity tables explicitly.
 *
 * Note on the adapter cast: `@auth/drizzle-adapter` types its schema map
 * against a generic Drizzle table shape (`DefaultPostgresSchema`) and does
 * not know our `users.role` column is a narrowed text-enum, nor that `email`
 * is `citext`. We build the schema map untyped and cast it once to the
 * adapter's own Postgres parameter type — a documented adapter quirk — so the
 * adapter compiles while our own queries stay fully typed.
 *
 * The explicit type argument on `DrizzleAdapter` pins the adapter's internal
 * `DefaultSchema<Flavor>` conditional to the Postgres branch, so the cast
 * target is the Postgres schema (not the MySQL/SQLite union members).
 */
type DrizzleDb = ReturnType<typeof getDb>;
type PgAdapterSchema = NonNullable<
  Parameters<typeof DrizzleAdapter<DrizzleDb>>[1]
>;

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const db = getDb();

  const adapterSchema = {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  } as unknown as PgAdapterSchema;

  return {
    adapter: DrizzleAdapter<DrizzleDb>(db, adapterSchema),
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24 * 14, // 14 days
    },
    trustHost: true,
    pages: {
      signIn: "/login",
    },
    cookies: {
      sessionToken: {
        name: IS_PROD
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: IS_PROD,
        },
      },
    },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const { email, password } = parsed.data;

          // `users.email` is a citext column, so this lookup is
          // case-insensitive at the database level.
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user || !user.passwordHash) return null;

          const valid = await verifyPassword(user.passwordHash, password);
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        },
      }),
    ],
    callbacks: {
      /**
       * On sign-in `user` is the object returned by `authorize`. Copy its
       * `id` and `role` onto the JWT so later requests need no DB read.
       */
      jwt({ token, user }) {
        if (user) {
          token.id = user.id as string;
          token.role = (user as { role?: UserRole }).role ?? "client";
        }
        return token;
      },
      /**
       * Mirror the JWT claims onto `session.user` so route guards and
       * dashboards can read `id` and `role` directly.
       */
      session({ session, token }) {
        if (session.user) {
          session.user.id = (token.id as string | undefined) ?? session.user.id;
          session.user.role = (token.role as UserRole | undefined) ?? "client";
        }
        return session;
      },
    },
  };
});
