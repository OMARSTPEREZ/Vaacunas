const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
    const tests = ["PRIVADO", "OPS", "Campana Empresarial", "Jornada Externa", "Centro de Vacunacion", "Otro"];
    console.log("Allowed values for origen_aplicacion:");
    for (const t of tests) {
        const docNum = "TEST-" + Math.floor(Math.random() * 1000000);
        const { data, error } = await supabase.from('pacientes_vacunacion').insert({
            numero_documento: docNum,
            nombres_apellidos: "Test",
            regional: "Test",
            seccional: "Test",
            cargo: "Test",
            origen_aplicacion: t,
            tipo_vacuna: "TETANOS_DPT_DT",
            ano_activo: 2026,
            estado_servidor: "activo",
            alergias: "Ninguna",
            contraindicaciones: "Ninguna"
        }).select('id').single();

        if (error) {
            console.log(`[ ] FAILED '${t}': ${error.message}`);
        } else {
            console.log(`[x] SUCCESS! -> '${t}'`);
            await supabase.from('pacientes_vacunacion').delete().eq('id', data.id);
        }
    }
})();
