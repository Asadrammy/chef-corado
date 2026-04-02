// Test price validation fix
// This file can be run with: node test-price-validation.js

// Test cases for price validation
const testCases = [
  { input: 3500, expected: true, description: "3500 - Whole number" },
  { input: 3500.0, expected: true, description: "3500.0 - One decimal" },
  { input: 3500.00, expected: true, description: "3500.00 - Two decimals" },
  { input: 3500.123, expected: false, description: "3500.123 - Three decimals" },
  { input: -100, expected: false, description: "-100 - Negative number" },
  { input: 0, expected: false, description: "0 - Zero (not positive)" },
  { input: 100000, expected: true, description: "100000 - Max allowed" },
  { input: 100001, expected: false, description: "100001 - Over max" },
  { input: 99.99, expected: true, description: "99.99 - Two decimal places" },
  { input: 99.999, expected: false, description: "99.999 - Three decimal places" },
];

// Validation function (same as in security.ts)
function validatePrice(val) {
  // Positive check
  if (val <= 0) return false;
  
  // Max value check
  if (val > 100000) return false;
  
  // Decimal places check (the fix)
  if (!Number.isInteger(val * 100)) return false;
  
  return true;
}

// Run tests
console.log("🧪 Testing Price Validation Fix\n");
console.log("=" .repeat(50));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = validatePrice(testCase.input);
  const status = result === testCase.expected ? "✅ PASS" : "❌ FAIL";
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} ${testCase.description}`);
  console.log(`    Input: ${testCase.input}`);
  console.log(`    Expected: ${testCase.expected}, Got: ${result}`);
  console.log("");
});

console.log("=" .repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log(`🎯 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log("🎉 All tests passed! Price validation bug is fixed.");
} else {
  console.log("⚠️  Some tests failed. Please review the implementation.");
}

// Demonstrate the floating point issue
console.log("\n🔍 Floating Point Precision Demonstration:");
console.log("=" .repeat(50));

const problematicValue = 3500.00;
console.log(`Problematic value: ${problematicValue}`);
console.log(`Problematic value * 100: ${problematicValue * 100}`);
console.log(`IsInteger(val * 100): ${Number.isInteger(problematicValue * 100)}`);
console.log(`Old method (val % 0.01 === 0): ${problematicValue % 0.01 === 0}`);
console.log(`New method (Number.isInteger(val * 100)): ${Number.isInteger(problematicValue * 100)}`);

// Show why the old method fails
const problematicValue2 = 3500.123;
console.log(`\nProblematic value: ${problematicValue2}`);
console.log(`Problematic value * 100: ${problematicValue2 * 100}`);
console.log(`IsInteger(val * 100): ${Number.isInteger(problematicValue2 * 100)}`);
console.log(`Old method (val % 0.01 === 0): ${problematicValue2 % 0.01 === 0}`);
console.log(`New method (Number.isInteger(val * 100)): ${Number.isInteger(problematicValue2 * 100)}`);
