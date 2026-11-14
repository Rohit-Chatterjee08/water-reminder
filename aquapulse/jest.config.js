module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'es2020', strict: true, esModuleInterop: true } }] },
};
