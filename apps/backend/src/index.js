const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const path = require('path');
dotenv.config(); // Try root/default
dotenv.config({ path: path.join(__dirname, '../.env') }); // Try apps/backend/.env
dotenv.config({ path: path.join(__dirname, '../../../.env') }); // Try root from src

const app = express();
const port = process.env.PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('Connecting to Supabase at:', supabaseUrl ? '(Set)' : '(NOT SET)');
if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Supabase credentials missing from environment!');
}

let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully.');
} catch (err) {
    console.error('Failed to initialize Supabase client:', err.message);
    process.exit(1);
}

// In-memory cache for ubicaciones
let cachedUbicaciones = {
    regionales: [],
    seccionales: [],
    lastUpdated: null
};

async function reloadUbicacionesCache() {
    try {
        let hasMore = true;
        let from = 0;
        const size = 1000;
        const regionals = new Set();
        const seccionals = new Set();

        console.log('Fetching all ubicaciones from Supabase for cache...');
        while (hasMore) {
            const { data, error } = await supabase.from('pacientes_vacunacion').select('regional, seccional').range(from, from + size - 1);
            if (error) throw error;

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

        cachedUbicaciones.regionales = [...regionals].sort();
        cachedUbicaciones.seccionales = [...seccionals].sort();
        cachedUbicaciones.lastUpdated = new Date();
        console.log(`Cache updated: ${cachedUbicaciones.regionales.length} regionales, ${cachedUbicaciones.seccionales.length} seccionales.`);
    } catch (err) {
        console.error('Error fetching ubicaciones:', err.message);
    }
}

// Kick off initial cache load
reloadUbicacionesCache();

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/ubicaciones', (req, res) => {
    res.json(cachedUbicaciones);
});
app.get('/api/pacientes', async (req, res) => {
    try {
        const { query, regional, seccional, alergias } = req.query;
        let dbQuery = supabase.from('pacientes_vacunacion').select('*', { count: 'exact' });

        if (query) {
            dbQuery = dbQuery.or(`numero_documento.ilike.%${query}%,nombres_apellidos.ilike.%${query}%`);
        }
        if (regional) dbQuery = dbQuery.ilike('regional', `%${regional}%`);
        if (seccional) dbQuery = dbQuery.ilike('seccional', `%${seccional}%`);
        if (alergias) dbQuery = dbQuery.ilike('alergias', `%${alergias}%`);

        const { data, count, error } = await dbQuery.order('nombres_apellidos');

        if (error) throw error;
        res.json({ data, count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pacientes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pacientes/:id/dosis', async (req, res) => {
    try {
        const { id } = req.params;
        const { field, value, origen, responsable, observacion } = req.body;

        const updateData = {
            [field]: value,
            origen_aplicacion: origen,
            responsable_enfermeria: responsable
        };

        if (observacion !== undefined) {
            updateData.observacion = observacion;
        }

        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('logs_actividad')
            .insert([req.body]);

        if (error) throw error;
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Audit Error:', error.message);
        // We don't want to fail the main request if auditing fails
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/trabajador/:dni', async (req, res) => {
    try {
        const { dni } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updates)
            .eq('numero_documento', dni)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const { data: allPacientes, error } = await supabase
            .from('pacientes_vacunacion')
            .select('*');

        if (error) throw error;

        const total = allPacientes.length;
        const statsByRegion = {};

        // This is a simplified calculation. 
        // In a real app, you'd probably do this via SQL aggregation.
        allPacientes.forEach(p => {
            const region = p.regional || 'Desconocida';
            statsByRegion[region] = (statsByRegion[region] || 0) + 1;
        });

        res.json({
            total,
            statsByRegion,
            // Mocking percentages for the demo/dashboard based on real total
            verde_pct: total > 0 ? 82 : 0,
            rojo_pct: total > 0 ? 12 : 0,
            naranja_count: Math.round(total * 0.06)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/configuracion/vacunas', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('configuracion_vacunas')
            .select('*')
            .order('tipo_vacuna');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/configuracion/vacunas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('configuracion_vacunas')
            .update({
                intervalos: updates.intervalos,
                meses_refuerzo: updates.meses_refuerzo,
                dosis_requeridas: updates.dosis_requeridas,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});

// Trigger nodemon restart
