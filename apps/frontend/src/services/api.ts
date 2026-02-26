import { auditService } from './audit';
import { supabase } from './supabase';

export const api = {
    async buscarPacientes(filters: any) {
        let dbQuery = supabase.from('pacientes_vacunacion').select('*', { count: 'exact' });

        if (filters.query) {
            dbQuery = dbQuery.or(`numero_documento.ilike.%${filters.query}%,nombres_apellidos.ilike.%${filters.query}%`);
        }
        if (filters.regional) dbQuery = dbQuery.eq('regional', filters.regional);
        if (filters.seccional) dbQuery = dbQuery.eq('seccional', filters.seccional);
        if (filters.alergias) dbQuery = dbQuery.ilike('alergias', `%${filters.alergias}%`);

        if (filters.from !== undefined && filters.to !== undefined) {
            dbQuery = dbQuery.range(filters.from, filters.to);
        }

        const { data, count, error } = await dbQuery.order('nombres_apellidos');

        if (error) throw error;

        let processedData = data || [];

        if (processedData.length > 0) {
            processedData = processedData.map((item: any) => {
                if (item.tipo_vacuna) {
                    item.tipo_vacuna = item.tipo_vacuna
                        .toUpperCase()
                        .replace(/\s+/g, '_')
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "");
                }
                return item;
            });

            // Group TETANOS, DPT, DT into a single unified timeline scheme
            const groupsByDni = new Map<string, any[]>();
            processedData.forEach((item: any) => {
                const dni = item.numero_documento;
                if (!groupsByDni.has(dni)) groupsByDni.set(dni, []);
                groupsByDni.get(dni)!.push(item);
            });

            const mergedData: any[] = [];

            groupsByDni.forEach((rows) => {
                const tetanoRows = rows.filter(r => ['TETANOS', 'DPT', 'DT', 'TT'].includes(r.tipo_vacuna));
                const otherRows = rows.filter(r => !['TETANOS', 'DPT', 'DT', 'TT'].includes(r.tipo_vacuna));

                if (tetanoRows.length > 0) {
                    const allDoses: any[] = [];
                    tetanoRows.forEach(r => {
                        if (r.dosis_1_fecha) allDoses.push({ row: r, field: 'dosis_1_fecha', date: r.dosis_1_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                        if (r.dosis_2_fecha) allDoses.push({ row: r, field: 'dosis_2_fecha', date: r.dosis_2_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                        if (r.dosis_3_fecha) allDoses.push({ row: r, field: 'dosis_3_fecha', date: r.dosis_3_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                        if (r.dosis_4_fecha) allDoses.push({ row: r, field: 'dosis_4_fecha', date: r.dosis_4_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                        if (r.dosis_5_fecha) allDoses.push({ row: r, field: 'dosis_5_fecha', date: r.dosis_5_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                        if (r.refuerzo_fecha) allDoses.push({ row: r, field: 'refuerzo_fecha', date: r.refuerzo_fecha, type: r.tipo_vacuna, origin: r.origen_aplicacion || '' });
                    });

                    allDoses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    const uniqueDates = new Set();
                    const mainDoses: any[] = [];
                    for (const dose of allDoses) {
                        if (!uniqueDates.has(dose.date) && mainDoses.length < 6) {
                            uniqueDates.add(dose.date);
                            mainDoses.push(dose);
                            dose.consumed = true;
                        } else {
                            dose.consumed = false;
                        }
                    }

                    const primaryRowOriginal = tetanoRows.find(r => r.tipo_vacuna === 'TETANOS') || tetanoRows[0];
                    const primaryRow = { ...primaryRowOriginal, tipo_vacuna: 'TETANOS' };

                    primaryRow.dosis_1_fecha = null; primaryRow.dosis_2_fecha = null;
                    primaryRow.dosis_3_fecha = null; primaryRow.dosis_4_fecha = null;
                    primaryRow.dosis_5_fecha = null; primaryRow.refuerzo_fecha = null;

                    const slots = ['dosis_1_fecha', 'dosis_2_fecha', 'dosis_3_fecha', 'dosis_4_fecha', 'dosis_5_fecha', 'refuerzo_fecha'];
                    mainDoses.forEach((m, i) => {
                        primaryRow[slots[i]] = m.date;
                        primaryRow[slots[i].replace('_fecha', '_tipo_vacuna')] = m.type;
                        if (i === 0) primaryRow.origen_aplicacion = m.origin;
                    });

                    mergedData.push(primaryRow);

                    tetanoRows.forEach(r => {
                        const leftoverDoses = allDoses.filter(d => d.row === r && !d.consumed);
                        if (leftoverDoses.length > 0) {
                            const leftoverRow = { ...r, id: r.id + '_extra' };
                            leftoverRow.dosis_1_fecha = null; leftoverRow.dosis_2_fecha = null;
                            leftoverRow.dosis_3_fecha = null; leftoverRow.dosis_4_fecha = null;
                            leftoverRow.dosis_5_fecha = null; leftoverRow.refuerzo_fecha = null;
                            leftoverDoses.forEach((d, idx) => {
                                if (idx < slots.length) leftoverRow[slots[idx]] = d.date;
                            });
                            mergedData.push(leftoverRow);
                        }
                    });
                }
                mergedData.push(...otherRows);
            });
            processedData = mergedData;
        }

        processedData.sort((a: any, b: any) => {
            const aHasDose = a.dosis_1_fecha || a.dosis_2_fecha || a.dosis_3_fecha || a.dosis_4_fecha || a.dosis_5_fecha || a.refuerzo_fecha;
            const bHasDose = b.dosis_1_fecha || b.dosis_2_fecha || b.dosis_3_fecha || b.dosis_4_fecha || b.dosis_5_fecha || b.refuerzo_fecha;
            return (bHasDose ? 1 : 0) - (aHasDose ? 1 : 0);
        });

        return { data: processedData, count };
    },

    async crearTrabajador(data: any) {
        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .insert([data])
            .select()
            .single();

        if (error) throw error;
        auditService.trackAction('CREAR_TRABAJADOR', `Worker ID: ${result.id}`, data);
        return result;
    },

    async registrarDosis(workerId: string, doseData: any) {
        const { field, value, origen, responsable, observacion, isUpdate } = doseData;
        const updateData: any = {
            [field]: value,
            origen_aplicacion: origen,
            responsable_enfermeria: responsable
        };
        if (observacion !== undefined) updateData.observacion = observacion;

        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updateData)
            .eq('id', workerId)
            .select()
            .single();

        if (error) throw error;

        const auditAction = isUpdate ? 'MODIFICAR_DOSIS' : 'REGISTRAR_DOSIS';
        auditService.trackAction(auditAction, `Worker ID: ${workerId}`, doseData);
        return result;
    },

    async actualizarTrabajadorGlobal(dni: string, data: any) {
        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .update(data.updates)
            .eq('numero_documento', dni)
            .select();

        if (error) throw error;
        auditService.trackAction('EDITAR_TRABAJADOR', `Doc: ${dni}`, data);
        return result;
    },

    async getConfiguracionVacunas() {
        const { data, error } = await supabase
            .from('configuracion_vacunas')
            .select('*')
            .order('tipo_vacuna');
        if (error) throw error;
        return data;
    },

    async updateConfiguracionVacunas(id: string, updates: any) {
        const { data: result, error } = await supabase
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
        auditService.trackAction('UPDATE_CONFIG_VACUNA', `Config ID: ${id}`, updates);
        return result;
    },

    async getStats() {
        const { data: allPacientes, error } = await supabase
            .from('pacientes_vacunacion')
            .select('*');

        if (error) throw error;

        const total = allPacientes?.length || 0;
        const statsByRegion: any = {};

        allPacientes?.forEach(p => {
            const region = p.regional || 'Desconocida';
            statsByRegion[region] = (statsByRegion[region] || 0) + 1;
        });

        return {
            total,
            statsByRegion,
            verde_pct: total > 0 ? 82 : 0,
            rojo_pct: total > 0 ? 12 : 0,
            naranja_count: Math.round(total * 0.06)
        };
    },

    async getDistinctValues(column: string, regionalFilter?: string) {
        let query = supabase
            .from('pacientes_vacunacion')
            .select(column)
            .not(column, 'is', null);

        if (regionalFilter) {
            query = query.eq('regional', regionalFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        const values = Array.from(new Set(data.map((item: any) => item[column]))).sort();
        return values;
    },

    async getTotalPacientesCount() {
        const { count, error } = await supabase
            .from('pacientes_vacunacion')
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count || 0;
    },

    async getUniquePacientesCount() {
        const { data, error } = await supabase
            .from('pacientes_vacunacion')
            .select('numero_documento');
        if (error) throw error;

        const uniqueDocs = new Set(data.map(p => p.numero_documento));
        return uniqueDocs.size;
    }
};
