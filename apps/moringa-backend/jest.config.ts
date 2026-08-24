module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@moringa/backend/(.*)$': '<rootDir>/src/$1',
    '^@moringa/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '../../coverage',
};
