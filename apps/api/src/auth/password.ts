import argon2 from 'argon2';

const OPTIONS = { type: argon2.argon2id as 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (p: string): Promise<string> => argon2.hash(p, OPTIONS);

export async function verifyPassword(hash: string, p: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, p);
  } catch {
    return false;
  }
}

// Băm giả để thời gian phản hồi không lộ email có tồn tại hay không.
export const DUMMY_HASH_PROMISE = hashPassword('dummy-password-for-timing');
