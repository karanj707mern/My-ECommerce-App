module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@moringa/backend/(.*)$': '<rootDir>/$1',
    '^@moringa/shared/(.*)$': '<rootDir>/../../libs/shared/src/$1',
  },
  collectCoverageFrom: ['**/*.(t|s)'],
  coverageDirectory: '../../coverage',
};
