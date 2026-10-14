import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

const envFile = process.env.NODE_ENV === 'production' ? '../.env.prod' : '../.env';

dotenv.config({ path: fileURLToPath(new URL(envFile, import.meta.url)) });
