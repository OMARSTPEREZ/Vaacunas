export type EstadoSemaforo = 'ROJO' | 'NARANJA' | 'VERDE';
export type TipoVacuna = 'TETANOS' | 'DPT' | 'DT' | 'HEPATITIS_B' | 'FIEBRE_AMARILLA' | 'INFLUENZA' | 'HEPATITIS_A' | 'OTRA';
export type OrigenAplicacion = 'PRIVADO' | 'OPS';

export interface Paciente {
    id: string;
    numero_documento: string;
    nombres_apellidos: string;
    regional: string;
    seccional: string;
    cargo: string;
    alergias: string;
    estado_servidor: 'activo' | 'inactivo';
    ano_activo: number;
    dosis_1_fecha?: string;
    dosis_2_fecha?: string;
    dosis_3_fecha?: string;
    dosis_4_fecha?: string;
    dosis_5_fecha?: string;
    refuerzo_fecha?: string;
    origen_aplicacion?: OrigenAplicacion;
    created_at: string;
    updated_at: string;
}

export interface ResultadoSemaforo {
    estado: EstadoSemaforo;
    proximaDosis: string | null;
    detalle: string;
}
