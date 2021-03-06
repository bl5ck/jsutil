module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'node'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.js$',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js'],
};
