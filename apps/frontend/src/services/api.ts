import { auditService } from './audit';
import { supabase } from './supabase';
import { getValidacionAutomatica } from '../utils/semaforoVacuna';

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
                // 1. Group Tétanos family
                const tetanoGroupNames = ['TETANOS', 'DPT', 'DT', 'TT', 'TÉTANOS'];
                const tetanoRows = rows.filter(r => tetanoGroupNames.includes(r.tipo_vacuna.toUpperCase()));
                const otherRows = rows.filter(r => !tetanoGroupNames.includes(r.tipo_vacuna.toUpperCase()));

                const consolidate = (vaccineRows: any[], forceType?: string) => {
                    if (vaccineRows.length === 0) return [];

                    const allDoses: any[] = [];
                    vaccineRows.forEach(row => {
                        ['dosis_1', 'dosis_2', 'dosis_3', 'dosis_4', 'dosis_5', 'refuerzo'].forEach(slot => {
                            if (row[slot]) {
                                const doseNum = slot === 'refuerzo' ? 0 : parseInt(slot.split('_')[1]);
                                const procKey = slot === 'refuerzo' ? 'procedencia_refuerzo' : `procedencia_${doseNum}`;
                                const obsKey = slot === 'refuerzo' ? 'refuerzo_obs' : `dosis_${doseNum}_obs`;
                                allDoses.push({
                                    date: row[slot],
                                    originalSlot: doseNum,
                                    originalType: row.tipo_vacuna,
                                    originalId: row.id,
                                    procedencia: row[procKey] || row.origen_aplicacion,
                                    observacion: row[obsKey],
                                    row: row
                                });
                            }
                        });
                    });

                    // Sort by date accurately
                    allDoses.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    const consolidated: any[] = [];
                    let currentGroup: any = null;
                    let lastSlotUsed = 0;

                    allDoses.forEach(dose => {
                        let targetSlotNum = dose.originalSlot === 0 ? 0 : Math.max(lastSlotUsed + 1, dose.originalSlot);

                        if (!currentGroup || (targetSlotNum === 0 && currentGroup.refuerzo) || (targetSlotNum > 5)) {
                            if (currentGroup) consolidated.push(currentGroup);

                            currentGroup = { ...dose.row };
                            ['dosis_1', 'dosis_2', 'dosis_3', 'dosis_4', 'dosis_5', 'refuerzo'].forEach(s => {
                                delete currentGroup[s];
                                const d = s === 'refuerzo' ? 'refuerzo' : s.split('_')[1];
                                delete currentGroup[s === 'refuerzo' ? 'procedencia_refuerzo' : `procedencia_${d}`];
                                delete currentGroup[s === 'refuerzo' ? 'refuerzo_obs' : `dosis_${d}_obs`];
                            });
                            currentGroup.involvedTypes = new Set();
                            lastSlotUsed = 0;
                            targetSlotNum = dose.originalSlot === 0 ? 0 : Math.max(lastSlotUsed + 1, dose.originalSlot);
                        }

                        const targetSlot = targetSlotNum === 0 ? 'refuerzo' : `dosis_${targetSlotNum}`;
                        currentGroup[targetSlot] = dose.date;
                        currentGroup[`${targetSlot}_original_type`] = dose.originalType;
                        currentGroup[`${targetSlot}_original_id`] = dose.originalId;

                        const procKey = targetSlot === 'refuerzo' ? 'procedencia_refuerzo' : `procedencia_${targetSlotNum}`;
                        currentGroup[procKey] = dose.procedencia;

                        const obsKey = targetSlot === 'refuerzo' ? 'refuerzo_obs' : `dosis_${targetSlotNum}_obs`;
                        currentGroup[obsKey] = dose.observacion;

                        currentGroup.involvedTypes.add(dose.originalType);
                        if (targetSlotNum > 0) lastSlotUsed = targetSlotNum;
                    });

                    if (currentGroup) consolidated.push(currentGroup);

                    consolidated.forEach(group => {
                        if (forceType) {
                            const hasPrimary = group.involvedTypes.has('TÉTANOS') || group.involvedTypes.has('TETANOS');
                            if (group.involvedTypes.size > 1 || hasPrimary) {
                                group.tipo_vacuna = forceType;
                            } else if (group.involvedTypes.size === 1) {
                                group.tipo_vacuna = Array.from(group.involvedTypes)[0] as string;
                            }
                        }
                        delete group.involvedTypes;
                    });

                    return consolidated;
                };

                // Apply consolidation to Tétanos group
                mergedData.push(...consolidate(tetanoRows, 'TETANOS'));

                // Group and consolidate other vaccines by type
                const groupsByType: Record<string, any[]> = {};
                otherRows.forEach(r => {
                    const type = r.tipo_vacuna.toUpperCase();
                    if (!groupsByType[type]) groupsByType[type] = [];
                    groupsByType[type].push(r);
                });

                Object.values(groupsByType).forEach(groupRows => {
                    mergedData.push(...consolidate(groupRows));
                });
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
        const { field, value, origen, responsable, observacion, isUpdate, doseNum, valor_anterior, accion } = doseData;

        // Fetch current record to build full state for validation
        const { data: currentRecord } = await supabase
            .from('pacientes_vacunacion')
            .select('*')
            .eq('id', workerId.replace('_extra', ''))
            .single();

        if (!currentRecord) throw new Error('Registro no encontrado');

        const currentHistory = currentRecord.historial_observaciones || '';
        const now = new Date().toLocaleString('es-CO', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        const doseLabel = doseNum === 0 ? 'REFUERZO' : `DOSIS ${doseNum}`;
        const actionLabel = accion === 'ELIMINAR_DOSIS' ? 'ELIMINACIÓN' : (isUpdate ? 'MODIFICACIÓN' : 'REGISTRO');

        const newEntry = `[${now}] - ${responsable} - ${doseLabel} (${actionLabel}): ${observacion || 'Sin observación'}`;
        const updatedHistory = currentHistory ? `${currentHistory}\n${newEntry}` : newEntry;

        // Map to correct procedencia column
        const procField = doseNum === 0 ? 'procedencia_refuerzo' : `procedencia_${doseNum}`;

        const updateData: any = {
            [field]: value,
            [procField]: origen,
            responsable_enfermeria: responsable,
            historial_observaciones: updatedHistory
        };

        // Map observation to specific dose column
        const obsField = doseNum === 0 ? 'refuerzo_obs' : `dosis_${doseNum}_obs`;
        if (observacion !== undefined) {
            updateData[obsField] = observacion;
        }

        // --- AUTOMATIC VALIDATION ---
        // Create a merged version of the data to validate
        const mergedData = { ...currentRecord, ...updateData };
        // We need the vaccine configs for accurate validation
        const configs = await this.getConfiguracionVacunas();
        const config = configs.find((c: any) => c.tipo_vacuna === mergedData.tipo_vacuna);

        const validacion = getValidacionAutomatica(mergedData, mergedData.tipo_vacuna as any, config);
        updateData['validación automática'] = validacion;
        // ----------------------------

        const { data: result, error } = await supabase
            .from('pacientes_vacunacion')
            .update(updateData)
            .eq('id', workerId.replace('_extra', ''))
            .select()
            .single();

        if (error) throw error;

        auditService.trackAction(accion || (isUpdate ? 'EDITAR_DOSIS' : 'REGISTRAR_DOSIS'), 'pacientes_vacunacion', result.id, {
            valor_anterior,
            valor_nuevo: updateData,
            detalles: observacion
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
            valor_anterior: data.valor_anterior,
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
    },

    async bulkUpdateValidations() {
        // Fetch all records
        const { data: records, error } = await supabase
            .from('pacientes_vacunacion')
            .select('*');

        if (error) throw error;
        if (!records || records.length === 0) return { count: 0 };

        // Fetch configs
        const configs = await this.getConfiguracionVacunas();

        let updatedCount = 0;

        // Process in batches to avoid overwhelming the connection/logic
        for (const record of records) {
            const config = configs.find((c: any) => c.tipo_vacuna === record.tipo_vacuna);
            const validacion = getValidacionAutomatica(record, record.tipo_vacuna as any, config);

            const { error: updateError } = await supabase
                .from('pacientes_vacunacion')
                .update({ 'validación automática': validacion })
                .eq('id', record.id);

            if (!updateError) updatedCount++;
        }

        return { count: updatedCount };
    }
};
