import { listEnv, optionalEnv, requireEnv } from '@app/common';

const jwtIssuer = requireEnv('AUTH_JWT_ISSUER');

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv('DATABASE_URL'),
  /** Access tokens are verified locally against the auth service's public keys. */
  auth: {
    jwksUrl: requireEnv('AUTH_JWKS_URL'),
    /** The auth service's `BETTER_AUTH_URL`, which Better Auth uses as `iss` and default `aud`. */
    issuer: jwtIssuer,
    audience: optionalEnv('AUTH_JWT_AUDIENCE') ?? jwtIssuer,
  },
  kafka: {
    brokers: listEnv('KAFKA_BROKERS'),
    clientId: requireEnv('KAFKA_CLIENT_ID'),
    /** Consumer group of the projection consumer. */
    groupId: requireEnv('KAFKA_GROUP_ID'),
  },
};
