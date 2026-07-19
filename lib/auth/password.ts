import bcrypt from "bcryptjs";

// Credentials auth uses bcrypt hashes stored in User.passwordHash. bcryptjs is
// pure-JS (no native build) so it runs anywhere the Node runtime does.
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
