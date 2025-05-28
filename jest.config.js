// jest.config.js
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
      'src/**/*.{js,jsx}',
      '!**/node_modules/**',
      '!**/vendor/**'
    ]
  };