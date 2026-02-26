const http = require('http');

const data = JSON.stringify({
    field: "dosis_1_fecha",
    value: new Date().toISOString().split('T')[0],
    origen: "local",
    responsable: "Test Nurse"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    // 5eb6ad08-ccfd-4eab-b241-c1eaafd7aaca is the UUID we created previously.
    path: '/api/pacientes/5eb6ad08-ccfd-4eab-b241-c1eaafd7aaca/dosis',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', (error) => console.error('Error:', error.message));
req.write(data);
req.end();
