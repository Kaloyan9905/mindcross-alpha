import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id parameters for MindCross. These match the OWASP-recommended
 * baseline for argon2id. Keep them in one place so a future tuning change is
 * a single edit. Changing these does not invalidate existing hashes —
 * @node-rs/argon2 encodes the parameters into the hash string and reads them
 * back at verify time.
 */
const ARGON2_OPTIONS = {
  // argon2id == algorithm variant 2
  algorithm: 2 as const,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

/**
 * Hash a plaintext password with argon2id. Returns the encoded hash string
 * (includes salt + parameters) suitable for storing in `users.password_hash`.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored argon2id hash. Returns false
 * (never throws) if the hash is malformed or does not match.
 */
export async function verifyPassword(
  hashString: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(hashString, plain);
  } catch {
    return false;
  }
}
