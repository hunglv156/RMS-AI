import path from 'node:path';
import dotenv from 'dotenv';
import { migrate } from './migrate';

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const url = process.env.DATABASE_URL_ADMIN;
  if (!url) throw new Error('DATABASE_URL_ADMIN chưa được đặt');
  const done = await migrate(url, direction, direction === 'down' ? 1 : Infinity);
  console.log(`${direction}: ${done.join(', ') || '(không có gì)'}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
