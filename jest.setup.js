import '@testing-library/jest-dom'

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

global.fetch = jest.fn()
