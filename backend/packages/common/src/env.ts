// Fail-fast env readers shared by every service's config.ts.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function listEnv(name: string): string[] {
  return requireEnv(name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
