require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function run() {
    const { data, error } = await supabase.from('pacientes_vacunacion').select('*').limit(1);
    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Columns:", Object.keys(data[0] || {}));
    }
}

run();
