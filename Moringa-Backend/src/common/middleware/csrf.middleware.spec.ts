import { CsrfMiddleware } from './csrf.middleware';

describe('CsrfMiddleware', () => {
  const middleware = new CsrfMiddleware();

  function mockResponse() {
    const res: any = {
      cookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return res;
  }

  it('allows API-prefixed auth endpoints without a CSRF check', () => {
    const req: any = {
      method: 'POST',
      path: '/api/v1/auth/login',
      headers: {},
      cookies: { 'csrf-token': 'token-value' },
    };
    const res = mockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('blocks non-exempt state-changing requests missing the token', () => {
    const req: any = {
      method: 'POST',
      path: '/api/v1/profile/update',
      headers: {},
      cookies: {},
    };
    const res = mockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
