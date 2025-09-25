// Test client for the Triumvirate server
const http = require('http');

function testServer() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/status',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('✅ Server status:', jsonData);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Test SSE endpoint
function testSSE() {
    console.log('\nTesting SSE endpoint...');
    
    const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/prompt',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`✅ SSE connected - Status: ${res.statusCode}`);
        
        res.on('data', (chunk) => {
            const line = chunk.toString().trim();
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.substring(6));
                    console.log('📨 Received:', data);
                } catch (error) {
                    console.log('📥 Raw data:', line);
                }
            }
        });

        res.on('end', () => {
            console.log('✅ SSE stream ended');
        });
    });

    req.on('error', (error) => {
        console.error('❌ SSE error:', error.message);
    });

    req.write(JSON.stringify({
        prompt: "What's the current time and date?"
    }));
    
    req.end();
}

// Run tests
async function runTests() {
    try {
        await testServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        testSSE();
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTests();