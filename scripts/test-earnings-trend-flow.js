// Test script to debug earnings trend data flow
const testEarningsTrend = async () => {
  console.log('🧪 Testing earnings trend data flow...\n');
  
  // Simulate the data structure we expect from API
  const mockEarningsTrend = [
    { date: "Mar 19", earnings: 0 },
    { date: "Mar 20", earnings: 0 },
    { date: "Mar 21", earnings: 1275 },
    { date: "Mar 22", earnings: 0 },
    { date: "Mar 23", earnings: 0 },
    { date: "Mar 24", earnings: 0 },
    { date: "Mar 25", earnings: 0 },
    { date: "Mar 26", earnings: 0 },
    { date: "Mar 27", earnings: 0 },
    { date: "Mar 28", earnings: 722.5 },
    { date: "Mar 29", earnings: 0 },
    { date: "Mar 30", earnings: 0 },
    { date: "Mar 31", earnings: 0 },
    { date: "Apr 1", earnings: 0 }
  ];
  
  console.log('📊 Mock Earnings Trend Data:');
  mockEarningsTrend.forEach((item, index) => {
    console.log(`${index + 1}. ${item.date}: $${item.earnings}`);
  });
  
  // Test date splitting logic
  console.log('\n🔍 Testing Date Splitting:');
  mockEarningsTrend.forEach(item => {
    const day = item.date.split(' ')[1] || item.date;
    console.log(`"${item.date}" -> "${day}"`);
  });
  
  // Test height calculation
  console.log('\n📏 Testing Height Calculation:');
  const maxEarnings = Math.max(...mockEarningsTrend.map(d => d.earnings), 1);
  console.log(`Max Earnings: $${maxEarnings}`);
  
  mockEarningsTrend.forEach(item => {
    const heightPercentage = maxEarnings > 0 ? (item.earnings / maxEarnings) * 100 : 5;
    console.log(`${item.date}: $${item.earnings} -> ${heightPercentage.toFixed(1)}% height`);
  });
  
  console.log('\n✅ Data flow test complete!');
  console.log('\n🚀 Next steps:');
  console.log('1. Check browser console for actual data');
  console.log('2. Verify bars are visible with debug info');
  console.log('3. Remove debug section once working');
};

testEarningsTrend();
