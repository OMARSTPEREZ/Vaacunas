const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

(async () => {
    const docNum = "TEST-" + Math.floor(Math.random() * 1000000);
    const { error } = await supabase.from('pacientes_vacunacion').insert({
        numero_documento: docNum, nombres_apellidos: "Test", regional: "Test", seccional: "Test", cargo: "Test",
        tipo_vacuna: "TETANOS_DPT_DT", ano_activo: 2026, estado_servidor: "activo", alergias: "Ninguna", contraindicaciones: "Ninguna"
    });
    console.log("Insert 1 (Tetanus):", error?.message || "Success");

    const { error: err2 } = await supabase.from('pacientes_vacunacion').insert({
        numero_documento: docNum, nombres_apellidos: "Test", regional: "Test", seccional: "Test", cargo: "Test",
        tipo_vacuna: "FIEBRE_AMARILLA", ano_activo: 2026, estado_servidor: "activo", alergias: "Ninguna", contraindicaciones: "Ninguna"
    });
    console.log("Insert 2 (Yellow Fever):", err2?.message || "Success");

    await supabase.from('pacientes_vacunacion').delete().eq('numero_documento', docNum);
})();
