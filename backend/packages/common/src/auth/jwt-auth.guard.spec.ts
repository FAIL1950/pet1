import {
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWTPayload,
} from 'jose';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard.js';

const options = {
  jwksUrl: 'http://auth/api/auth/jwks',
  issuer: 'http://localhost',
  audience: 'http://localhost',
};

const defaultClaims: JWTPayload = {
  email: 'a@example.com',
  name: 'Alice',
  image: null,
};

function contextFor(request: Partial<AuthenticatedRequest>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function bearer(token: string): Partial<AuthenticatedRequest> {
  return { headers: { authorization: `Bearer ${token}` } };
}

describe('JwtAuthGuard', () => {
  const fetchMock = vi.fn();
  let signingKey: CryptoKey;
  let foreignKey: CryptoKey;
  let guard: JwtAuthGuard;

  function sign(
    claims: JWTPayload = defaultClaims,
    {
      key = signingKey,
      issuer = options.issuer,
      expiresAt = '15m',
    }: { key?: CryptoKey; issuer?: string; expiresAt?: string | number } = {},
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: 'key-1' })
      .setSubject('user-1')
      .setIssuer(issuer)
      .setAudience(options.audience)
      .setExpirationTime(expiresAt)
      .sign(key);
  }

  beforeAll(async () => {
    const pair = await generateKeyPair('ES256', { extractable: true });
    signingKey = pair.privateKey;
    ({ privateKey: foreignKey } = await generateKeyPair('ES256'));
    const jwk = await exportJWK(pair.publicKey);
    fetchMock.mockImplementation(async () =>
      Response.json({ keys: [{ ...jwk, kid: 'key-1', alg: 'ES256' }] }),
    );
  });

  beforeEach(() => {
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    // Fresh guard per test: the remote JWKS set caches keys per instance.
    guard = new JwtAuthGuard(options);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects requests without a bearer token without fetching keys', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: 'Basic x' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies the token locally and exposes the user on the request', async () => {
    const request = bearer(await sign());

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);

    expect(request.user).toEqual({
      id: 'user-1',
      email: 'a@example.com',
      name: 'Alice',
      image: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches the keys across requests', async () => {
    const token = await sign();
    await guard.canActivate(contextFor(bearer(token)));
    await guard.canActivate(contextFor(bearer(token)));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['malformed', () => Promise.resolve('not-a-jwt')],
    ['signed with another key', () => sign(defaultClaims, { key: foreignKey })],
    ['expired', () => sign(defaultClaims, { expiresAt: 1 })],
    ['from another issuer', () => sign(defaultClaims, { issuer: 'http://evil' })],
    ['missing user claims', () => sign({})],
  ])('rejects a token that is %s', async (_case, makeToken) => {
    await expect(
      guard.canActivate(contextFor(bearer(await makeToken()))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('answers 503 when the keys cannot be fetched', async () => {
    const token = await sign();
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
