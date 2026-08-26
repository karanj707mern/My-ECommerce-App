/**
 * Jest bootstrap — runs before any test module is loaded.
 *
 * Provides deterministic fallbacks for environment variables that backend
 * providers read eagerly at construction time. Without these, DI compilation
 * of full testing modules fails before specs can override providers with
 * mocks (e.g. EncryptionService throws without ENCRYPTION_KEY).
 *
 * Values are dummy test-only constants — never real secrets. Any variable
 * already present in the environment is left untouched so CI can inject
 * its own values.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? 'jest-dummy-encryption-key-0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'jest-dummy-jwt-secret-for-unit-tests-only';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://jest:jest@localhost:5432/jest_placeholder';

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'jest-dummy-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'jest-dummy-refresh-secret';
