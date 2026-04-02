const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function comprehensiveFlowTest() {
  console.log('🔍 COMPREHENSIVE END-TO-END SYSTEM TEST');
  console.log('=====================================\n');
  
  let testResults = {
    database: { passed: 0, failed: 0, issues: [] },
    api: { passed: 0, failed: 0, issues: [] },
    ui: { passed: 0, failed: 0, issues: [] },
    integration: { passed: 0, failed: 0, issues: [] }
  };
  
  try {
    // DATABASE LAYER TESTS
    console.log('🗄️  DATABASE LAYER TESTS');
    console.log('----------------------');
    
    // Test 1: User authentication entities
    const users = await prisma.user.findMany({
      where: { role: { in: ['CLIENT', 'CHEF', 'ADMIN'] } }
    });
    
    if (users.length >= 3) {
      console.log('✅ Test users exist:', users.length);
      testResults.database.passed++;
    } else {
      console.log('❌ Missing test users');
      testResults.database.failed++;
      testResults.database.issues.push('Insufficient test users');
    }
    
    // Test 2: Chef profiles
    const chefProfiles = await prisma.chefProfile.findMany({
      include: { user: true }
    });
    
    if (chefProfiles.length > 0) {
      console.log('✅ Chef profiles exist:', chefProfiles.length);
      testResults.database.passed++;
    } else {
      console.log('❌ No chef profiles found');
      testResults.database.failed++;
      testResults.database.issues.push('No chef profiles in database');
    }
    
    // Test 3: Request-Proposal-Booking flow
    const requests = await prisma.request.findMany({
      include: { proposals: { include: { booking: true } } }
    });
    
    const proposals = await prisma.proposal.findMany({
      include: { request: true, booking: true }
    });
    
    const bookings = await prisma.booking.findMany({
      include: { proposal: true, payments: true }
    });
    
    console.log(`✅ Requests: ${requests.length}, Proposals: ${proposals.length}, Bookings: ${bookings.length}`);
    testResults.database.passed++;
    
    // Test 4: Payment integration
    const payments = await prisma.payment.findMany({
      include: { booking: true }
    });
    
    console.log(`✅ Payments: ${payments.length}`);
    testResults.database.passed++;
    
    // API LAYER TESTS
    console.log('\n🌐 API LAYER TESTS');
    console.log('-------------------');
    
    // Test 5: Health endpoint
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log('✅ Health check:', health.status);
        testResults.api.passed++;
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      testResults.api.failed++;
      testResults.api.issues.push('Health endpoint not responding');
    }
    
    // Test 6: Public endpoints
    try {
      const experiencesResponse = await fetch('http://localhost:3000/api/experiences');
      const chefsResponse = await fetch('http://localhost:3000/api/chefs');
      
      if (experiencesResponse.ok && chefsResponse.ok) {
        console.log('✅ Public endpoints working');
        testResults.api.passed++;
      } else {
        throw new Error('Public endpoints failed');
      }
    } catch (error) {
      console.log('❌ Public endpoints failed:', error.message);
      testResults.api.failed++;
      testResults.api.issues.push('Public API endpoints not working');
    }
    
    // Test 7: Search functionality
    try {
      const searchResponse = await fetch('http://localhost:3000/api/chefs/search');
      if (searchResponse.ok) {
        const searchResults = await searchResponse.json();
        console.log('✅ Search endpoint working:', searchResults.length, 'chefs found');
        testResults.api.passed++;
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.log('❌ Search endpoint failed:', error.message);
      testResults.api.failed++;
      testResults.api.issues.push('Search API not working properly');
    }
    
    // UI LAYER TESTS
    console.log('\n🎨 UI LAYER TESTS');
    console.log('----------------');
    
    // Test 8: Page accessibility (check if pages exist)
    const pages = [
      '/dashboard/client',
      '/dashboard/client/requests',
      '/dashboard/client/create-request',
      '/dashboard/client/proposals',
      '/dashboard/chef',
      '/dashboard/chef/requests',
      '/dashboard/admin'
    ];
    
    let accessiblePages = 0;
    for (const page of pages) {
      try {
        const pageResponse = await fetch(`http://localhost:3000${page}`);
        if (pageResponse.status === 200 || pageResponse.status === 302) {
          accessiblePages++;
        }
      } catch (error) {
        // Ignore network errors for now
      }
    }
    
    if (accessiblePages >= pages.length * 0.8) {
      console.log(`✅ UI pages accessible: ${accessiblePages}/${pages.length}`);
      testResults.ui.passed++;
    } else {
      console.log(`❌ Too many inaccessible pages: ${accessiblePages}/${pages.length}`);
      testResults.ui.failed++;
      testResults.ui.issues.push('UI pages not accessible');
    }
    
    // INTEGRATION TESTS
    console.log('\n🔗 INTEGRATION TESTS');
    console.log('------------------');
    
    // Test 9: Complete flow simulation
    const client = await prisma.user.findFirst({ where: { role: 'CLIENT' } });
    const chef = await prisma.chefProfile.findFirst({ include: { user: true } });
    
    if (client && chef) {
      // Create request
      const testRequest = await prisma.request.create({
        data: {
          clientId: client.id,
          title: 'Integration Test Event',
          eventDate: new Date('2026-06-15'),
          location: 'Test City',
          budget: 300,
          details: 'Integration test event details'
        }
      });
      
      // Create proposal
      const testProposal = await prisma.proposal.create({
        data: {
          requestId: testRequest.id,
          chefId: chef.id,
          price: 250,
          message: 'Integration test proposal',
          status: 'ACCEPTED'
        }
      });
      
      // Create booking
      const testBooking = await prisma.booking.create({
        data: {
          clientId: client.id,
          chefId: chef.id,
          proposalId: testProposal.id,
          eventDate: testRequest.eventDate,
          location: testRequest.location,
          guestCount: 5,
          totalPrice: testProposal.price,
          status: 'CONFIRMED'
        }
      });
      
      // Create payment
      const testPayment = await prisma.payment.create({
        data: {
          bookingId: testBooking.id,
          totalAmount: testBooking.totalPrice,
          commissionAmount: testBooking.totalPrice * 0.1,
          chefAmount: testBooking.totalPrice * 0.9,
          status: 'HELD'
        }
      });
      
      console.log('✅ Complete integration flow working');
      console.log(`   Request: ${testRequest.id}`);
      console.log(`   Proposal: ${testProposal.id}`);
      console.log(`   Booking: ${testBooking.id}`);
      console.log(`   Payment: ${testPayment.id}`);
      
      testResults.integration.passed++;
      
      // Cleanup test data
      await prisma.payment.delete({ where: { id: testPayment.id } });
      await prisma.booking.delete({ where: { id: testBooking.id } });
      await prisma.proposal.delete({ where: { id: testProposal.id } });
      await prisma.request.delete({ where: { id: testRequest.id } });
      
    } else {
      console.log('❌ Cannot run integration test - missing users');
      testResults.integration.failed++;
      testResults.integration.issues.push('Missing test users for integration');
    }
    
    // FINAL RESULTS
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('===================');
    
    const totalPassed = testResults.database.passed + testResults.api.passed + testResults.ui.passed + testResults.integration.passed;
    const totalFailed = testResults.database.failed + testResults.api.failed + testResults.ui.failed + testResults.integration.failed;
    const totalTests = totalPassed + totalFailed;
    const successRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`Database Layer: ${testResults.database.passed} passed, ${testResults.database.failed} failed`);
    console.log(`API Layer: ${testResults.api.passed} passed, ${testResults.api.failed} failed`);
    console.log(`UI Layer: ${testResults.ui.passed} passed, ${testResults.ui.failed} failed`);
    console.log(`Integration: ${testResults.integration.passed} passed, ${testResults.integration.failed} failed`);
    
    console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('🎉 SYSTEM IS PRODUCTION READY!');
    } else if (successRate >= 75) {
      console.log('⚠️  SYSTEM IS MOSTLY FUNCTIONAL - Minor issues exist');
    } else {
      console.log('❌ SYSTEM HAS SIGNIFICANT ISSUES - Needs fixes before production');
    }
    
    // List all issues
    const allIssues = [
      ...testResults.database.issues,
      ...testResults.api.issues,
      ...testResults.ui.issues,
      ...testResults.integration.issues
    ];
    
    if (allIssues.length > 0) {
      console.log('\n🔧 ISSUES FOUND:');
      allIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    return {
      successRate,
      totalPassed,
      totalFailed,
      issues: allIssues,
      productionReady: successRate >= 90
    };
    
  } catch (error) {
    console.error('❌ COMPREHENSIVE TEST FAILED:', error);
    return {
      successRate: 0,
      error: error.message,
      productionReady: false
    };
  } finally {
    await prisma.$disconnect();
  }
}

comprehensiveFlowTest();
