require('dotenv').config({ path: 'apps/backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let hasMore = true;
    let from = 0;
    const size = 1000;
    const regionals = new Set();
    const seccionals = new Set();

    console.log('Fetching data...');
    while (hasMore) {
        const { data, error } = await supabase.from('pacientes_vacunacion').select('regional, seccional').range(from, from + size - 1);
        if (error) { console.error(error); return; }

        data.forEach(d => {
            if (d.regional) regionals.add(d.regional.trim().toUpperCase());
            if (d.seccional) seccionals.add(d.seccional.trim().toUpperCase());
        });

        if (data.length < size) {
            hasMore = false;
        } else {
            from += size;
        }
    }

    console.log('Regionals:', [...regionals]);
    console.log('Seccionals:', [...seccionals]);
}
run();
