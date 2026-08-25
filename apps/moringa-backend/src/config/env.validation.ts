import { IsBoolean, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

export function ValidateEnv() {
  return function (target: unknown, key: string) {
    // validation placeholder
  };
}

export const validateEnv = () => ({
  app: {
    port: IsOptional(),
    corsOrigins: IsOptional(),
    isProduction: IsOptional(),
    jwtSecret: IsOptional(),
    googleClientId: IsOptional(),
  },
});
