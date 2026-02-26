require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
    const tests = ["local", "externo", "Local", "Externo", "LOCAL", "EXTERNO", "ESTA REGIONAL", "OTRA REGIONAL"];
    console.log("Allowed values:");
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

        if (!error) {
            console.log(`- ${t}`);
            await supabase.from('pacientes_vacunacion').delete().eq('id', data.id);
        }
    }
})();
