const http = require('http');

console.log('🧪 Dutch Roofing Video Server Test');
console.log('====================================');

// Test configuration
const SERVER_URL = 'http://localhost:3030';
const TEST_BUSINESS = {
  name: 'Broadway Realty',
  industry: 'real_estate'
};

// Sample HTML content for testing
const TEST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${TEST_BUSINESS.name} - Professional Services</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6;
            color: #333;
        }
        .hero {
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        }
        .hero h1 {
            font-size: 4em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .hero p {
            font-size: 1.5em;
            opacity: 0.95;
        }
        .services {
            padding: 80px 20px;
            background: #f8f9fa;
        }
        .services h2 {
            font-size: 3em;
            text-align: center;
            margin-bottom: 50px;
            color: #333;
        }
        .service-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }
        .service-card {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .service-card h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        .about {
            padding: 80px 20px;
            background: white;
            text-align: center;
        }
        .about h2 {
            font-size: 3em;
            margin-bottom: 30px;
            color: #333;
        }
        .about p {
            max-width: 800px;
            margin: 0 auto 20px;
            font-size: 1.1em;
            color: #666;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 50px;
            margin-top: 50px;
            flex-wrap: wrap;
        }
        .stat {
            text-align: center;
        }
        .stat-number {
            font-size: 3em;
            color: #667eea;
            font-weight: bold;
        }
        .stat-label {
            color: #666;
            margin-top: 10px;
        }
        .contact {
            padding: 80px 20px;
            background: #333;
            color: white;
            text-align: center;
        }
        .contact h2 {
            font-size: 3em;
            margin-bottom: 30px;
        }
        .contact-info {
            font-size: 1.2em;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            margin-top: 30px;
            padding: 15px 40px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-size: 1.1em;
            transition: background 0.3s ease;
        }
        .cta-button:hover {
            background: #764ba2;
        }
    </style>
</head>
<body>
    <div class="hero">
        <div>
            <h1>${TEST_BUSINESS.name}</h1>
            <p>Excellence in ${TEST_BUSINESS.industry.replace('_', ' ').toUpperCase()}</p>
        </div>
    </div>
    
    <div class="services">
        <h2>Our Services</h2>
        <div class="service-grid">
            <div class="service-card">
                <h3>Property Sales</h3>
                <p>Expert guidance through the entire sales process with maximum value for your property.</p>
            </div>
            <div class="service-card">
                <h3>Property Management</h3>
                <p>Complete property management services to maximize your investment returns.</p>
            </div>
            <div class="service-card">
                <h3>Market Analysis</h3>
                <p>In-depth market analysis and valuation services for informed decisions.</p>
            </div>
            <div class="service-card">
                <h3>Investment Consulting</h3>
                <p>Strategic real estate investment advice tailored to your goals.</p>
            </div>
        </div>
    </div>
    
    <div class="about">
        <h2>About ${TEST_BUSINESS.name}</h2>
        <p>With over 20 years of experience in the real estate industry, we've built our reputation on trust, expertise, and exceptional service. Our team of dedicated professionals is committed to helping you achieve your real estate goals.</p>
        <p>Whether you're buying your first home, selling a property, or looking for investment opportunities, we provide personalized solutions that deliver results.</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-number">500+</div>
                <div class="stat-label">Properties Sold</div>
            </div>
            <div class="stat">
                <div class="stat-number">98%</div>
                <div class="stat-label">Client Satisfaction</div>
            </div>
            <div class="stat">
                <div class="stat-number">20+</div>
                <div class="stat-label">Years Experience</div>
            </div>
        </div>
    </div>
    
    <div class="contact">
        <h2>Get In Touch</h2>
        <div class="contact-info">📞 (555) 123-4567</div>
        <div class="contact-info">✉️ info@broadwayrealty.com</div>
        <div class="contact-info">📍 123 Broadway, New York, NY 10001</div>
        <a href="#" class="cta-button">Schedule Consultation</a>
    </div>
</body>
</html>`;

// Function to make HTTP request
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Main test function
async function runTest() {
  try {
    // Step 1: Check server health
    console.log('\n1️⃣  Testing server health check...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3030,
      path: '/health',
      method: 'GET'
    });
    
    if (healthResponse.statusCode !== 200) {
      throw new Error(`Health check failed with status ${healthResponse.statusCode}`);
    }
    
    const healthData = JSON.parse(healthResponse.body);
    console.log('✅ Server is healthy:', healthData);
    
    // Step 2: Generate video
    console.log('\n2️⃣  Sending video generation request...');
    console.log(`   Business: ${TEST_BUSINESS.name}`);
    console.log(`   Industry: ${TEST_BUSINESS.industry}`);
    
    const videoData = JSON.stringify({
      business_name: TEST_BUSINESS.name,
      html_content: TEST_HTML
    });
    
    const startTime = Date.now();
    const videoResponse = await makeRequest({
      hostname: 'localhost',
      port: 3030,
      path: '/generate-video',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(videoData)
      }
    }, videoData);
    
    const duration = (Date.now() - startTime) / 1000;
    
    if (videoResponse.statusCode !== 200) {
      console.error('❌ Video generation failed:', videoResponse.body);
      throw new Error(`Video generation failed with status ${videoResponse.statusCode}`);
    }
    
    const videoResult = JSON.parse(videoResponse.body);
    console.log('✅ Video generated successfully!');
    console.log('   File:', videoResult.file_name);
    console.log('   Size:', videoResult.file_size_readable);
    console.log('   Duration:', videoResult.duration_estimate);
    console.log('   Time taken:', `${duration.toFixed(2)} seconds`);
    
    // Step 3: Verify video file
    console.log('\n3️⃣  Verifying video file...');
    const fs = require('fs');
    const path = require('path');
    const videoPath = path.join(__dirname, 'videos', videoResult.file_name);
    
    if (fs.existsSync(videoPath)) {
      const stats = fs.statSync(videoPath);
      console.log('✅ Video file verified:');
      console.log('   Path:', videoPath);
      console.log('   Size:', `${(stats.size / 1048576).toFixed(2)} MB`);
      
      if (stats.size < 1048576) {
        console.warn('⚠️  Warning: Video file is smaller than 1MB');
      }
    } else {
      console.error('❌ Video file not found at:', videoPath);
    }
    
    // Summary
    console.log('\n====================================');
    console.log('✅ All tests passed successfully!');
    console.log('====================================');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Check if server is running
console.log('\n⏳ Checking if server is running...');
makeRequest({
  hostname: 'localhost',
  port: 3030,
  path: '/health',
  method: 'GET'
}).then(() => {
  console.log('✅ Server is running');
  runTest();
}).catch(() => {
  console.log('❌ Server is not running');
  console.log('📝 Please start the server first with: npm start');
  console.log('   Then run this test in another terminal with: npm test');
  process.exit(1);
});