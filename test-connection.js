const axios = require('axios');

async function testConnection() {
  const API_URL = 'http://localhost:3001';
  
  try {
    console.log('Testing connection to:', API_URL);
    
    // Test health endpoint
    const health = await axios.get(`${API_URL}/api/health`);
    console.log('✅ Health check passed:', health.data);
    
    // Test eligibility endpoint with snake_case
    const testData = {
      client_info: {
        name: "Test User",
        age: 70,
        marital_status: "single",
        health_status: "stable"
      },
      assets: {
        countable: 5000,
        non_countable: 100000
      },
      income: {
        social_security: 1200,
        pension: 500
      },
      state: "CA"
    };
    
    console.log('\nSending test data...');
    const response = await axios.post(`${API_URL}/api/eligibility/assess`, testData);
    console.log('✅ Eligibility response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testConnection();