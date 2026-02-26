const http = require('http');

const testDose = (originValue) => {
    const data = JSON.stringify({
        field: "dosis_1_fecha",
        value: new Date().toISOString().split('T')[0],
        origen: originValue,
        responsable: "Test Nurse Origin " + originValue
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
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
        res.on('end', () => console.log(`Response for ${originValue}:`, res.statusCode, body));
    });

    req.on('error', (error) => console.error('Error:', error.message));
    req.write(data);
    req.end();
};

testDose("LOCAL");
testDose("EXTERNO");
