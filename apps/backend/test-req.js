const http = require('http');

const data = JSON.stringify({
    numero_documento: "999999" + Math.floor(Math.random() * 1000),
    nombres_apellidos: "Test User",
    regional: "Test",
    seccional: "Test",
    cargo: "Test",
    alergias: "None",
    contraindicaciones: "None",
    ano_activo: 2026,
    estado_servidor: "activo",
    tipo_vacuna: "TETANOS_DPT_DT"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/pacientes',
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
