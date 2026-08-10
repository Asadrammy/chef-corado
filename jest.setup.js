import '@testing-library/jest-dom'

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DATABASE_PUBLIC_URL = process.env.TEST_DATABASE_URL
  process.env.EXTERNAL_DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DIRECT_DATABASE_URL = process.env.TEST_DATABASE_URL
} else if (process.env.NODE_ENV === 'test') {
  const isolatedFallbackUrl = 'postgresql://postgres:postgres@localhost:5432/chef_marketplace_test'
  process.env.DATABASE_URL = isolatedFallbackUrl
  process.env.DATABASE_PUBLIC_URL = isolatedFallbackUrl
  process.env.EXTERNAL_DATABASE_URL = isolatedFallbackUrl
  process.env.DIRECT_DATABASE_URL = isolatedFallbackUrl
  process.env.CHEFACHEF_TEST_DATABASE_ISOLATED = 'false'
}

global.fetch = jest.fn(() =>
  Promise.reject(
    new Error(
      'global.fetch is not configured for this test. Mock it explicitly or invoke the API route handler directly.'
    )
  )
)
