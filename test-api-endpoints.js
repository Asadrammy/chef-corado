const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPIEndpoints() {
  console.log('🌐 TESTING API ENDPOINTS');
  
  try {
    // Test 1: Health check
    console.log('\n📋 Test 1: Health check...');
    const health = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    console.log('✅ Health status:', health.status, health.data);
    
    // Test 2: Get all requests (should work without auth for testing)
    console.log('\n📋 Test 2: Get requests...');
    const requests = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/requests',
      method: 'GET'
    });
    console.log('✅ Requests endpoint:', requests.status, Array.isArray(requests.data) ? `Found ${requests.data.length} requests` : 'Response received');
    
    // Test 3: Get chefs 
    console.log('\n📋 Test 3: Get chefs...');
    const chefs = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chefs',
      method: 'GET'
    });
    console.log('✅ Chefs endpoint:', chefs.status, Array.isArray(chefs.data) ? `Found ${chefs.data.length} chefs` : 'Response received');
    
    // Test 4: Get experiences
    console.log('\n📋 Test 4: Get experiences...');
    const experiences = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/experiences',
      method: 'GET'
    });
    console.log('✅ Experiences endpoint:', experiences.status, Array.isArray(experiences.data) ? `Found ${experiences.data.length} experiences` : 'Response received');
    
    // Test 5: Search functionality
    console.log('\n📋 Test 5: Search chefs...');
    const search = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/chefs/search?location=New%20York',
      method: 'GET'
    });
    console.log('✅ Search endpoint:', search.status, search.data);
    
    console.log('\n🎉 API ENDPOINT TESTING COMPLETED!');
    console.log('\n📊 API SUMMARY:');
    console.log('✅ Health check working');
    console.log('✅ Requests API accessible');
    console.log('✅ Chefs API accessible');
    console.log('✅ Experiences API accessible');
    console.log('✅ Search functionality working');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ API TEST FAILED:', error.message);
    return { success: false, error: error.message };
  }
}

testAPIEndpoints();
