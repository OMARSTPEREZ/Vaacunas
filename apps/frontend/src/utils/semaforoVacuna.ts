import { differenceInDays, addMonths, addYears, isBefore, parseISO } from 'date-fns';

export type EstadoSemaforo = 'ROJO' | 'NARANJA' | 'VERDE' | 'AZUL_MARINO';

interface ResultadoSemaforo {
    estado: EstadoSemaforo;
    proximaDosis: Date | null;
    detalle: string;
}

export type TipoVacuna = 'TETANOS' | 'DPT' | 'DT' | 'HEPATITIS_B' | 'FIEBRE_AMARILLA' | 'INFLUENZA' | 'HEPATITIS_A' | 'OTRA';

interface PacienteData {
    dosis_1_fecha: string | null;
    dosis_2_fecha: string | null;
    dosis_3_fecha: string | null;
    dosis_4_fecha: string | null;
    dosis_5_fecha: string | null;
    refuerzo_fecha: string | null;
    origen_aplicacion?: string | null;
}

export interface VacunaConfig {
    id: string;
    tipo_vacuna: string;
    nombre: string;
    dosis_requeridas: number;
    intervalos: number[];
    meses_refuerzo: number | null;
    es_dosis_unica: boolean;
}

export function getEstadoVacuna(paciente: PacienteData, tipoVacuna: TipoVacuna, config?: VacunaConfig): ResultadoSemaforo {
    const hoy = new Date();

    // Check if applied in another regional system
    const esExterno = paciente.origen_aplicacion &&
        paciente.origen_aplicacion.toLowerCase() !== 'local' &&
        paciente.origen_aplicacion.toLowerCase() !== 'esta regional';

    const d1 = paciente.dosis_1_fecha ? parseISO(paciente.dosis_1_fecha) : null;
    const d2 = paciente.dosis_2_fecha ? parseISO(paciente.dosis_2_fecha) : null;
    const d3 = paciente.dosis_3_fecha ? parseISO(paciente.dosis_3_fecha) : null;
    const d4 = paciente.dosis_4_fecha ? parseISO(paciente.dosis_4_fecha) : null;
    const d5 = paciente.dosis_5_fecha ? parseISO(paciente.dosis_5_fecha) : null;
    const ref = paciente.refuerzo_fecha ? parseISO(paciente.refuerzo_fecha) : null;

    const checkStatus = (fechaProgramada: Date | null): { estado: EstadoSemaforo; proximaDosis: Date | null } => {
        if (!fechaProgramada) return { estado: 'ROJO', proximaDosis: null };
        const diasRestantes = differenceInDays(fechaProgramada, hoy);

        if (isBefore(fechaProgramada, hoy)) {
            return { estado: 'ROJO', proximaDosis: fechaProgramada };
        }
        if (diasRestantes <= 15) {
            return { estado: 'NARANJA', proximaDosis: fechaProgramada };
        }

        // If the dose is up to date but came from another regional system, mark as Navy Blue
        if (esExterno) {
            return { estado: 'AZUL_MARINO', proximaDosis: fechaProgramada };
        }

        return { estado: 'VERDE', proximaDosis: fechaProgramada };
    };

    // If dynamic config provides rules, use them
    if (config) {
        const dosisTodas = [d1, d2, d3, d4, d5];

        if (config.es_dosis_unica) {
            if (!d1) return { estado: 'ROJO', proximaDosis: hoy, detalle: 'Falta Dosis Única' };
            const proximoRefuerzo = config.meses_refuerzo ? (ref ? addMonths(ref, config.meses_refuerzo) : addMonths(d1, config.meses_refuerzo)) : null;
            return { ...checkStatus(proximoRefuerzo), detalle: 'Dosis única aplicada' };
        }

        // Multiple doses logic based on config
        for (let i = 0; i < config.dosis_requeridas; i++) {
            if (!dosisTodas[i]) {
                if (i === 0) return { estado: 'ROJO', proximaDosis: hoy, detalle: 'Falta Dosis 1' };

                // If previous dose was not found, it means they missed a dose.
                // We should normally fail at that dose, but the loop guarantees that dosisTodas[i-1] IS found because it didn't return.
                const previousDose = dosisTodas[i - 1] as Date;
                const intervalMonths = config.intervalos[i - 1] || 1;
                let expectedDate = addMonths(previousDose, intervalMonths);
                const statusObj = checkStatus(expectedDate);

                const dateStr = expectedDate.toISOString().split('T')[0];
                return { ...statusObj, detalle: `Pendiente Dosis ${i + 1} (${dateStr})` };
            }
        }

        // Booster logic
        if (config.meses_refuerzo) {
            const lastDoseDate = dosisTodas[config.dosis_requeridas - 1] as Date;
            const proximoRefuerzo = ref ? addMonths(ref, config.meses_refuerzo) : addMonths(lastDoseDate, config.meses_refuerzo);
            return { ...checkStatus(proximoRefuerzo), detalle: ref ? 'Refuerzo vigente' : `Esquema completo, refuerzo pendiente (${addMonths(lastDoseDate, config.meses_refuerzo).toISOString().split('T')[0]})` };
        }

        return { estado: 'VERDE', proximaDosis: null, detalle: 'Esquema Vigente' };
    }

    // Fallback to hardcoded logic if no config provided yet (for backward compatibility during migration)
    switch (tipoVacuna) {
        case 'TETANOS':
        case 'DPT':
        case 'DT': {
            if (!d1) return { estado: 'ROJO', proximaDosis: hoy, detalle: 'Falta Dosis 1' };
            if (!d2) return { ...checkStatus(addMonths(d1, 1)), detalle: `Pendiente Dosis 2 (${addMonths(d1, 1).toISOString().split('T')[0]})` };
            if (!d3) return { ...checkStatus(addMonths(d2, 6)), detalle: `Pendiente Dosis 3 (${addMonths(d2, 6).toISOString().split('T')[0]})` };
            if (!d4) return { ...checkStatus(addYears(d3, 1)), detalle: `Pendiente Dosis 4 (${addYears(d3, 1).toISOString().split('T')[0]})` };
            if (!d5) return { ...checkStatus(addYears(d4, 1)), detalle: `Pendiente Dosis 5 (${addYears(d4, 1).toISOString().split('T')[0]})` };

            return { estado: 'VERDE', proximaDosis: null, detalle: 'Esquema Vigente' };
        }

        case 'HEPATITIS_B':
        case 'HEPATITIS_A': {
            if (!d1) return { estado: 'ROJO', proximaDosis: hoy, detalle: 'Falta Dosis 1' };
            if (!d2) return { ...checkStatus(addMonths(d1, 1)), detalle: 'Pendiente Dosis 2' };
            if (!d3) return { ...checkStatus(addMonths(d2, 6)), detalle: 'Pendiente Dosis 3' };

            const proximoRefuerzo = ref ? addYears(ref, 1) : addYears(d3, 1);
            return { ...checkStatus(proximoRefuerzo), detalle: ref ? 'Refuerzo vigente' : 'Esquema completo, refuerzo pendiente' };
        }

        case 'FIEBRE_AMARILLA': {
            if (!d1) return { estado: 'ROJO', proximaDosis: hoy, detalle: 'Falta Dosis Única' };
            const proximoRefuerzo = ref ? addYears(ref, 10) : addYears(d1, 10);
            return { ...checkStatus(proximoRefuerzo), detalle: 'Dosis única aplicada' };
        }

        case 'INFLUENZA': {
            if (!d1) return { estado: 'VERDE', proximaDosis: null, detalle: 'Opcional, sin iniciar' };
            const proximoRefuerzo = ref ? addYears(ref, 1) : addYears(d1, 1);
            // Even if expired, maybe not strictly RED for influenza overall, but let's calculate normally then ignore in global
            return { ...checkStatus(proximoRefuerzo), detalle: ref ? 'Refuerzo vigente' : 'Dosis anual requerida' };
        }

        default:
            return { estado: 'VERDE', proximaDosis: null, detalle: 'Otra vacuna/Sin esquema definido' };
    }
}

export function calculateComplianceStats(pacientes: any[]) {
    if (pacientes.length === 0) {
        return {
            coberturaTotal: 0,
            iniciados: 0,
            abandono: 0,
            alertasCalidad: 0,
            funnel: [0, 0, 0, 0, 0],
            countsByVacuna: [],
            complianceByRegion: [],
            complianceBySeccional: []
        };
    }

    let iniciados = 0;
    let completos = 0;
    let alertasCalidad = 0;
    const funnel = [0, 0, 0, 0, 0]; // D1 to D5
    const countsByVacuna: Record<string, number> = {};
    const statsByRegion: Record<string, { total: number, completos: number }> = {};
    const statsBySeccional: Record<string, { total: number, completos: number }> = {};

    pacientes.forEach(p => {
        const tipo = (p.tipo_vacuna || 'TETANOS').toUpperCase();
        countsByVacuna[tipo] = (countsByVacuna[tipo] || 0) + 1;

        const region = p.regional || 'Desconocida';
        const seccional = p.seccional || 'Desconocida';

        if (!statsByRegion[region]) statsByRegion[region] = { total: 0, completos: 0 };
        if (!statsBySeccional[seccional]) statsBySeccional[seccional] = { total: 0, completos: 0 };

        statsByRegion[region].total++;
        statsBySeccional[seccional].total++;

        const doses = [p.dosis_1_fecha, p.dosis_2_fecha, p.dosis_3_fecha, p.dosis_4_fecha, p.dosis_5_fecha];
        const hasAny = doses.some(d => d);

        if (hasAny) iniciados++;

        // Funnel calculation (only applicable to multi-dose vaccines like Tetanos/DPT/DT)
        if (['TETANOS', 'DPT', 'DT'].includes(tipo)) {
            doses.forEach((d, i) => { if (d) funnel[i]++; });
        }

        // Compliance logic
        let isComplete = false;
        if (['TETANOS', 'DPT', 'DT'].includes(tipo)) {
            isComplete = !!p.dosis_5_fecha;
        } else if (tipo === 'HEPATITIS_B') {
            isComplete = !!p.dosis_3_fecha;
        } else if (tipo === 'FIEBRE_AMARILLA') {
            isComplete = !!p.dosis_1_fecha;
        } else if (tipo === 'INFLUENZA') {
            isComplete = !!p.dosis_1_fecha; // Or whatever is defined
        } else {
            isComplete = !!p.dosis_1_fecha;
        }

        if (isComplete) {
            completos++;
            statsByRegion[region].completos++;
            statsBySeccional[seccional].completos++;
        }

        // Quality Alerts: Missing intermediate doses
        let firstDoseIdx = doses.findIndex(d => d);
        let lastDoseIdx = -1;
        for (let i = doses.length - 1; i >= 0; i--) {
            if (doses[i]) {
                lastDoseIdx = i;
                break;
            }
        }

        if (firstDoseIdx !== -1 && lastDoseIdx !== -1) {
            for (let i = firstDoseIdx; i < lastDoseIdx; i++) {
                if (!doses[i]) {
                    alertasCalidad++;
                    break;
                }
            }
        }
    });

    const complianceByRegion = Object.entries(statsByRegion).map(([name, stats]) => ({
        name,
        value: Math.round((stats.completos / stats.total) * 100)
    })).sort((a, b) => b.value - a.value);

    const complianceBySeccional = Object.entries(statsBySeccional).map(([name, stats]) => ({
        name,
        value: Math.round((stats.completos / stats.total) * 100)
    })).sort((a, b) => b.value - a.value);

    return {
        coberturaTotal: Math.round((completos / pacientes.length) * 100),
        iniciados,
        abandono: iniciados > 0 ? Math.round(((iniciados - completos) / iniciados) * 100) : 0,
        alertasCalidad,
        funnel,
        countsByVacuna: Object.entries(countsByVacuna).map(([name, value]) => ({ name, value })),
        complianceByRegion,
        complianceBySeccional
    };
}
