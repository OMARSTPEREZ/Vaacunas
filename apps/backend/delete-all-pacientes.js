require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAll() {
    console.log('Deleting all records from pacientes_vacunacion...');
    const { data, error } = await supabase
        .from('pacientes_vacunacion')
        .delete()
        .neq('numero_documento', 'impossible_value'); // Deletes everything

    if (error) {
        console.error('Error deleting:', error);
    } else {
        console.log('Successfully deleted all records. Response:', data);
    }
}

deleteAll();
