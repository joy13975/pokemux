import { randomUUID } from 'node:crypto';
export const socketPath = () => `/tmp/pokemux-${randomUUID()}.sock`;
