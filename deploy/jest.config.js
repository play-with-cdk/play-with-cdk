module.exports = {
    "roots": [
      "<rootDir>/test",
      "<rootDir>/foobar"
    ],
    testMatch: [ '**/*.test.ts'],
    "transform": {
      "^.+\\.tsx?$": "ts-jest"
    },
  }
