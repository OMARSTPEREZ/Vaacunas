

import { supabase } from './supabase';

export interface AuditLog {
    usuario_id?: string;
    usuario_email?: string;
    accion: string;
    tabla: string;
    registro_id?: string;
    valor_anterior?: any;
    valor_nuevo?: any;
    detalles?: string;
    timestamp?: string;
}

class AuditService {
    private async log(log: AuditLog) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;

            const timestamp = new Date().toISOString();

            // Detailed log data (matches auditoria_detallada schema)
            const detailedLog = {
                usuario_id: user?.id,
                usuario_email: user?.email || 'ANON',
                accion: log.accion,
                tabla: log.tabla,
                registro_id: log.registro_id,
                valor_anterior: log.valor_anterior,
                valor_nuevo: log.valor_nuevo,
                detalles: log.detalles,
                created_at: timestamp
            };

            // Simple log data (matches logs_actividad schema)
            const simpleLog = {
                accion: log.accion,
                usuario_nombre: user?.email || 'ANON',
                detalles: `${log.detalles || ''} | Table: ${log.tabla} | Record: ${log.registro_id}`,
                timestamp: timestamp
            };

            // Log to the new detailed table
            const { error: detailedError } = await supabase
                .from('auditoria_detallada')
                .insert([detailedLog]);

            if (detailedError) {
                console.error('Audit Detailed Error:', detailedError);
            }

            // For compatibility, also log to the old simple table
            const { error: simpleError } = await supabase
                .from('logs_actividad')
                .insert([simpleLog]);

            if (simpleError) {
                console.error('Audit Simple Error:', simpleError);
            }
        } catch (error) {
            console.warn('Major audit failure:', error);
        }
    }

    async trackAction(accion: string, tabla: string, registro_id: string, options: {
        valor_anterior?: any,
        valor_nuevo?: any,
        detalles?: string
    } = {}) {
        return this.log({
            accion,
            tabla,
            registro_id,
            ...options
        });
    }
}

export const auditService = new AuditService();
