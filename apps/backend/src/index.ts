import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/pacientes', async (req: any, res: any) => {
    try {
        const { query, regional, seccional } = req.query;
        let dbQuery = supabase.from('pacientes_vacunacion').select('*', { count: 'exact' });

        if (query) {
            dbQuery = dbQuery.or(`numero_documento.ilike.%${query}%,nombres_apellidos.ilike.%${query}%`);
        }
        if (regional) dbQuery = dbQuery.ilike('regional', `%${regional}%`);
        if (seccional) dbQuery = dbQuery.ilike('seccional', `%${seccional}%`);

        const { data, count, error } = await dbQuery.order('nombres_apellidos');

        if (error) throw error;
        res.json({ data, count });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pacientes', async (req: any, res: any) => {
    try {
        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .insert([req.body])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pacientes/:id/dosis', async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { field, value, origen } = req.body;

        const updateData: any = {
            [field]: value,
            origen_aplicacion: origen
        };

        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend listening at http://localhost:${port}`);
});
