import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { z } from 'zod';

export interface JwtAuthOptions {
  /** Auth service's JWKS endpoint, e.g. `http://auth/api/auth/jwks`. */
  jwksUrl: string;
  /** Must equal the auth service's `BETTER_AUTH_URL` (Better Auth's default `iss`/`aud`). */
  issuer: string;
  audience: string;
}

/** Provide with `{ provide: JWT_AUTH_OPTIONS, useValue: config.auth }`. */
export const JWT_AUTH_OPTIONS = Symbol('JWT_AUTH_OPTIONS');

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export type AuthenticatedRequest = Request & { user: AuthUser };

// Claims set by the auth service's `jwt({ definePayload })`.
const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string(),
  name: z.string(),
  image: z.string().nullish(),
});

// Problems with the token itself; anything else (JWKS unreachable/timeout/garbage) is on our side.
const INVALID_TOKEN_ERRORS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
];

/**
 * Verifies the `Authorization: Bearer <jwt>` access token issued by the auth service and exposes
 * the user as `request.user`. Verification is local: the auth service's public keys are fetched
 * once and cached (re-fetched only for an unknown `kid`), so auth isn't called per request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    @Inject(JWT_AUTH_OPTIONS) private readonly options: JwtAuthOptions,
  ) {
    this.jwks = createRemoteJWKSet(new URL(options.jwksUrl));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException();

    const { sub, email, name, image } = await this.verify(token);
    request.user = { id: sub, email, name, image: image ?? null };
    return true;
  }

  private async verify(token: string): Promise<z.infer<typeof claimsSchema>> {
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(token, this.jwks, {
        issuer: this.options.issuer,
        audience: this.options.audience,
      }));
    } catch (error) {
      if (INVALID_TOKEN_ERRORS.some((type) => error instanceof type)) {
        throw new UnauthorizedException();
      }
      // Keys unavailable must not look like "signed out" to the client.
      this.logger.error(
        'JWKS fetch failed',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException();
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) throw new UnauthorizedException();
    return claims.data;
  }
}

function bearerToken(header: string | undefined): string | null {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}
