// Integration tests run against the dedicated Neon test branch so they never
// touch the development database. Pure unit tests are unaffected.
import 'dotenv/config';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
