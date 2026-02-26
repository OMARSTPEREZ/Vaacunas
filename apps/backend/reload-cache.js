require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function run() {
    console.log("Attempting to reload schema cache via API call if RPC exists...");
    // Trying to call the built-in PostgREST schema cache reload function if exposed.
    // Otherwise, we'll just try to make a request that forces a cache miss if possible.
    const { data, error } = await supabase.rpc('reload_schema_cache');
    if (error) {
        console.log("RPC Method failed or doesn't exist. Attempting raw query...");
        console.log(error.message);
    } else {
        console.log("Schema cache reloaded via RPC!");
    }
}

run();
