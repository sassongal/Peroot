import { describe, it, expect } from 'vitest';
import { apiError, API_ERRORS } from '@/lib/api-error';

describe('apiError', () => {
  it('returns 401 for unauthorized', () => {
    const res = API_ERRORS.unauthorized();
    expect(res.status).toBe(401);
  });

  it('returns 403 for forbidden', () => {
    const res = API_ERRORS.forbidden();
    expect(res.status).toBe(403);
  });

  it('returns 404 for notFound', () => {
    const res = API_ERRORS.notFound();
    expect(res.status).toBe(404);
  });

  it('returns 400 for badRequest', () => {
    const res = API_ERRORS.badRequest('Invalid input');
    expect(res.status).toBe(400);
  });

  it('returns 429 for rateLimit', () => {
    const res = API_ERRORS.rateLimit();
    expect(res.status).toBe(429);
  });

  it('returns 500 for internal', () => {
    const res = API_ERRORS.internal();
    expect(res.status).toBe(500);
  });

  it('returns correct status from apiError directly', () => {
    const res = apiError({ status: 418, error: "I'm a teapot" });
    expect(res.status).toBe(418);
  });
});

describe('API_ERRORS', () => {
  it('has all expected error types', () => {
    expect(API_ERRORS).toHaveProperty('unauthorized');
    expect(API_ERRORS).toHaveProperty('forbidden');
    expect(API_ERRORS).toHaveProperty('notFound');
    expect(API_ERRORS).toHaveProperty('badRequest');
    expect(API_ERRORS).toHaveProperty('rateLimit');
    expect(API_ERRORS).toHaveProperty('internal');
  });
});
