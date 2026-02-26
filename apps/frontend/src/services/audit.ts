

import { supabase } from './supabase';

export interface AuditLog {
    usuario_id?: string;
    usuario_nombre?: string;
    accion: string;
    recurso?: string;
    detalles?: any;
    timestamp?: string;
}

class AuditService {
    private async log(log: AuditLog) {
        try {
            const userRole = localStorage.getItem('userRole') || 'ANON';
            const logData = {
                ...log,
                usuario_nombre: userRole,
                timestamp: new Date().toISOString()
            };

            await supabase
                .from('logs_actividad')
                .insert([logData]);
        } catch (error) {
            console.warn('Silent audit failure:', error);
        }
    }

    async trackAction(accion: string, recurso: string, detalles?: any) {
        return this.log({ accion, recurso, detalles });
    }
}

export const auditService = new AuditService();
