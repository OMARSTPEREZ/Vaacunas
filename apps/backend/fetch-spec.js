const http = require('http');
const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) + '/rest/v1/';
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url.startsWith('https://')) {
    console.error("Invalid URL:", url);
    process.exit(1);
}

https.get(url, { headers: { apikey: key } }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        try {
            const spec = JSON.parse(body);
            const props = spec.definitions.pacientes_vacunacion.properties;
            console.log("origen_aplicacion definition:", JSON.stringify(props.origen_aplicacion, null, 2));
        } catch (e) {
            console.error("Failed to parse or find definition:", e.message);
        }
    });
}).on('error', console.error);
