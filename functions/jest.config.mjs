/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 10000,
  testPathIgnorePatterns: ['build/.*', 'src/lib/events_decorator.test.ts']
}
