import { auditService } from './audit';
import { supabase } from './supabase';

export const api = {
    async buscarPacientes(filters: any) {
        let dbQuery = supabase.from('pacientes_vacunacion').select('*', { count: 'exact' });

        if (filters.query) {
            dbQuery = dbQuery.or(`no_de_documento.ilike.%${filters.query}%,nombres_apellidos.ilike.%${filters.query}%`);
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
                const dni = item.no_de_documento;
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
                        [1, 2, 3, 4, 5, 'refuerzo'].forEach(n => {
                            const dateKey = n === 'refuerzo' ? 'refuerzo' : `dosis_${n}`;
                            const typeKey = n === 'refuerzo' ? 'refuerzo_tipo_vacuna' : `dosis_${n}_tipo_vacuna`;
                            const procKey = n === 'refuerzo' ? 'procedencia_refuerzo' : `procedencia_${n}`;

                            if (r[dateKey]) {
                                allDoses.push({
                                    row: r,
                                    field: dateKey,
                                    date: r[dateKey],
                                    type: r[typeKey] || r.tipo_vacuna,
                                    origin: r[procKey] || r.origen_aplicacion || ''
                                });
                            }
                        });
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

                    primaryRow.dosis_1 = null; primaryRow.dosis_2 = null;
                    primaryRow.dosis_3 = null; primaryRow.dosis_4 = null;
                    primaryRow.dosis_5 = null; primaryRow.refuerzo = null;

                    const slots = ['dosis_1', 'dosis_2', 'dosis_3', 'dosis_4', 'dosis_5', 'refuerzo'];
                    mainDoses.forEach((m, i) => {
                        primaryRow[slots[i]] = m.date;
                        primaryRow[slots[i] + '_tipo_vacuna'] = m.type;
                        const procKey = slots[i].includes('refuerzo') ? 'procedencia_refuerzo' : `procedencia_${i + 1}`;
                        primaryRow[procKey] = m.origin;
                    });

                    mergedData.push(primaryRow);

                    tetanoRows.forEach(r => {
                        const leftoverDoses = allDoses.filter(d => d.row === r && !d.consumed);
                        if (leftoverDoses.length > 0) {
                            const leftoverRow = { ...r, id: r.id + '_extra' };
                            leftoverRow.dosis_1 = null; leftoverRow.dosis_2 = null;
                            leftoverRow.dosis_3 = null; leftoverRow.dosis_4 = null;
                            leftoverRow.dosis_5 = null; leftoverRow.refuerzo = null;
                            leftoverDoses.forEach((d, idx) => {
                                if (idx < slots.length) {
                                    leftoverRow[slots[idx]] = d.date;
                                    const procKey = slots[idx].includes('refuerzo') ? 'procedencia_refuerzo' : `procedencia_${idx + 1}`;
                                    leftoverRow[procKey] = d.origin;
                                }
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
            const aHasDose = a.dosis_1 || a.dosis_2 || a.dosis_3 || a.dosis_4 || a.dosis_5 || a.refuerzo;
            const bHasDose = b.dosis_1 || b.dosis_2 || b.dosis_3 || b.dosis_4 || b.dosis_5 || b.refuerzo;
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
        auditService.trackAction('CREAR_TRABAJADOR', 'pacientes_vacunacion', result.id, { valor_nuevo: data });
        return result;
    },

    async registrarDosis(workerId: string, doseData: any) {
        const { field, value, origen, responsable, observacion, isUpdate, doseNum } = doseData;

        // Map to correct procedencia column
        const procField = doseNum === 0 ? 'procedencia_refuerzo' : `procedencia_${doseNum}`;

        const updateData: any = {
            [field]: value,
            [procField]: origen,
            responsable_enfermeria: responsable
        };

        // Map observation to specific dose column
        if (observacion !== undefined) {
            const obsField = doseNum === 0 ? 'refuerzo_obs' : `dosis_${doseNum}_obs`;
            updateData[obsField] = observacion;
        }

        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updateData)
            .eq('id', workerId)
            .select()
            .single();

        if (error) throw error;

        const auditAction = isUpdate ? 'MODIFICAR_DOSIS' : 'REGISTRAR_DOSIS';
        auditService.trackAction(auditAction, 'pacientes_vacunacion', workerId, {
            valor_nuevo: updateData,
            detalles: `Dosis: ${doseNum}, Campo: ${field}`
        });
        return result;
    },

    async actualizarTrabajadorGlobal(dni: string, data: any) {
        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .update(data.updates)
            .eq('no_de_documento', dni)
            .select();

        if (error) throw error;
        auditService.trackAction('EDITAR_TRABAJADOR', 'pacientes_vacunacion', dni, {
            valor_nuevo: data.updates,
            detalles: data.observacion
        });
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
        auditService.trackAction('UPDATE_CONFIG_VACUNA', 'configuracion_vacunas', id, { valor_nuevo: updates });
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
            .select('no_de_documento');
        if (error) throw error;

        const uniqueDocs = new Set(data.map(p => p.no_de_documento));
        return uniqueDocs.size;
    }
};
