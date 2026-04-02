// Test script to verify API endpoints
// Run this in the browser console on localhost:3000

async function testAuth() {
  try {
    console.log("Testing authentication...")
    const authResponse = await fetch("/api/debug/auth")
    const authData = await authResponse.json()
    console.log("Auth status:", authData)
    
    if (!authData.session) {
      console.log("Please log in first:")
      console.log("Admin: admin@example.com / admin123")
      console.log("Chef: chef@example.com / chef123")
      console.log("Client: client@example.com / client123")
      return
    }
    
    console.log(`Logged in as: ${authData.session.user.email} (${authData.session.user.role})`)
    
    // Test chef profile endpoint
    if (authData.session.user.role === "CHEF") {
      console.log("Testing chef profile endpoint...")
      const profileResponse = await fetch("/api/chef/profile")
      const profileData = await profileResponse.json()
      console.log("Profile response:", profileData)
      
      // Test requests endpoint
      console.log("Testing requests endpoint...")
      const requestsResponse = await fetch("/api/requests")
      const requestsData = await requestsResponse.json()
      console.log("Requests response:", requestsData)
      
      // Test menus endpoint
      console.log("Testing menus endpoint...")
      const menusResponse = await fetch("/api/menus")
      const menusData = await menusResponse.json()
      console.log("Menus response:", menusData)
    }
    
  } catch (error) {
    console.error("Test failed:", error)
  }
}

// Run the test
testAuth()
