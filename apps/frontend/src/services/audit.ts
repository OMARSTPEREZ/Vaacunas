

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

            const logData = {
                ...log,
                usuario_id: user?.id,
                usuario_email: user?.email || 'ANON',
                timestamp: new Date().toISOString()
            };

            // Log to the new detailed table
            await supabase
                .from('auditoria_detallada')
                .insert([logData]);

            // For compatibility, also log to the old simple table if needed
            await supabase
                .from('logs_actividad')
                .insert([{
                    accion: log.accion,
                    usuario_nombre: user?.email || 'ANON',
                    detalles: `${log.detalles || ''} | Table: ${log.tabla} | Record: ${log.registro_id}`,
                    timestamp: logData.timestamp
                }]);
        } catch (error) {
            console.warn('Silent audit failure:', error);
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
