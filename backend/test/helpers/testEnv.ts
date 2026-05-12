import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { vi } from 'vitest';

export const createTempDir = async (prefix: string) =>
  fs.mkdtemp(path.join(os.tmpdir(), prefix));

export const withEnv = async <T>(
  values: Record<string, string>,
  callback: () => Promise<T>,
) => {
  const previousEntries = Object.entries(values).map(([key]) => [key, process.env[key]] as const);

  Object.assign(process.env, values);
  vi.resetModules();

  try {
    return await callback();
  } finally {
    for (const [key, value] of previousEntries) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    vi.resetModules();
  }
};
