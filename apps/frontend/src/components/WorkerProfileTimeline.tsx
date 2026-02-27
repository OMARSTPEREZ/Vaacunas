import React, { useState, useEffect } from 'react';
import {
    Calendar,
    AlertCircle,
    CheckCircle2,
    MapPin,
    Briefcase,
    Plus,
    Settings,
    X,
    Loader2,
    Edit2,
    Syringe,
    MoreVertical,
    Dna,
    UserPlus,
    ShieldCheck,
    Workflow,
    Activity
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../components/UI';
import { getEstadoVacuna, type VacunaConfig, type TipoVacuna } from '../utils/semaforoVacuna';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- STYLING & THEMES ---
const vaccineThemes: Record<string, { color: string; icon: any; bg: string; border: string; text: string; lightBg: string }> = {
    'COVID-19': { color: 'blue', icon: Dna, bg: 'bg-blue-500', border: 'border-blue-100', text: 'text-blue-700', lightBg: 'bg-blue-50/50' },
    'HEPATITIS_B': { color: 'red', icon: Activity, bg: 'bg-rose-500', border: 'border-rose-100', text: 'text-rose-700', lightBg: 'bg-rose-50/50' },
    'INFLUENZA': { color: 'purple', icon: Workflow, bg: 'bg-violet-500', border: 'border-violet-100', text: 'text-violet-700', lightBg: 'bg-violet-50/50' },
    'TETANOS': { color: 'amber', icon: ShieldCheck, bg: 'bg-amber-500', border: 'border-amber-100', text: 'text-amber-700', lightBg: 'bg-amber-50/50' },
    'FIEBRE_AMARILLA': { color: 'emerald', icon: Activity, bg: 'bg-emerald-500', border: 'border-emerald-100', text: 'text-emerald-700', lightBg: 'bg-emerald-50/50' },
    'DEFAULT': { color: 'slate', icon: Syringe, bg: 'bg-slate-500', border: 'border-slate-100', text: 'text-slate-700', lightBg: 'bg-slate-50/50' }
};

interface TimelineItemProps {
    doseNum: number;
    date: string | null | undefined;
    status: 'completed' | 'current' | 'future' | 'navy';
    label: string;
    onEdit?: () => void;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ doseNum, date, status, label, onEdit }) => {
    return (
        <div className="flex flex-col items-center gap-2 relative z-10 flex-1 group">
            <div className="flex items-center gap-2 cursor-pointer" onClick={status !== 'future' ? onEdit : undefined}>
                <div
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300",
                        status === 'completed' || status === 'navy' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" :
                            status === 'current' ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl scale-110" :
                                "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600"
                    )}
                >
                    {status === 'completed' || status === 'navy' ? <CheckCircle2 size={16} strokeWidth={3} /> : (doseNum === 0 ? 'R' : doseNum)}
                </div>

                {status !== 'future' && (
                    <button
                        className="text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 flex items-center justify-center"
                        title="Modificar Registro"
                    >
                        <Edit2 size={18} />
                    </button>
                )}
            </div>
            <div className="text-center">
                <p className={cn(
                    "text-[9px] font-black uppercase tracking-tight",
                    status === 'current' ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-zinc-500"
                )}>{label}</p>
                {date && (
                    <p className="text-[10px] text-primary font-bold italic mt-0.5 leading-none">{date}</p>
                )}
            </div>
        </div>
    );
};

const WorkerProfileTimeline: React.FC<{ worker: any }> = ({ worker: initialWorker }) => {
    const [worker, setWorker] = useState(() => {
        if (!initialWorker.schemes) return { ...initialWorker, schemes: [initialWorker] };
        return initialWorker;
    });

    useEffect(() => {
        let w = { ...initialWorker };
        if (!w.schemes) w.schemes = [w];
        setWorker(w);
    }, [initialWorker]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [selectedNewVaccine, setSelectedNewVaccine] = useState<string>('');
    const [enrolling, setEnrolling] = useState(false);
    const [loading, setLoading] = useState(false);

    // Global Profile Editing
    const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
    const [profileFormData, setProfileFormData] = useState({
        nombres_apellidos: '',
        no_de_documento: '',
        sexo: '',
        regional: '',
        seccional: '',
        "año_activo": '',
        estado_servidor: '',
        observacion: ''
    });
    const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState({
        vaccineType: '',
        exactVaccineType: '',
        doseNum: 1,
        date: new Date().toISOString().split('T')[0],
        origin: 'OPS',
        responsable: '',
        observacion: '',
        targetWorkerId: ''
    });
    const [configs, setConfigs] = useState<VacunaConfig[]>([]);

    React.useEffect(() => {
        const fetchConfigs = async () => {
            try {
                const data = await api.getConfiguracionVacunas();
                setConfigs(data);
            } catch (error) {
                console.error('Error fetching configs:', error);
            }
        };
        fetchConfigs();
    }, []);

    const [customVacunaEnroll, setCustomVacunaEnroll] = useState('');

    const openRegisterModal = (type: string, targetWorkerId?: string) => {
        const schemeRow = worker.schemes.find((s: any) => s.tipo_vacuna === type || s.id === targetWorkerId);
        let firstMissing = 1;
        if (schemeRow) {
            const config = configs.find(c => c.tipo_vacuna === type);
            const req = config ? config.dosis_requeridas : 5;
            for (let i = 1; i <= req; i++) {
                if (!schemeRow[`dosis_${i}`]) {
                    firstMissing = i;
                    break;
                }
            }
        }

        setFormData({
            ...formData,
            vaccineType: type,
            exactVaccineType: type,
            doseNum: firstMissing,
            date: new Date().toISOString().split('T')[0],
            origin: 'OPS',
            responsable: worker.responsable_enfermeria || '',
            observacion: '',
            targetWorkerId: targetWorkerId || ''
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEditModal = (schemeRow: any, type: string, d: number) => {
        const fieldName = d === 0 ? 'refuerzo' : `dosis_${d}`;
        const date = schemeRow[fieldName];
        const exactType = d === 0 ? schemeRow.refuerzo_tipo_vacuna : schemeRow[`dosis_${d}_tipo_vacuna`];

        setFormData({
            ...formData,
            vaccineType: type,
            exactVaccineType: exactType || type,
            doseNum: d,
            date: date || new Date().toISOString().split('T')[0],
            origin: schemeRow.origen_aplicacion || 'OPS',
            responsable: schemeRow.responsable_enfermeria || worker.responsable_enfermeria || '',
            observacion: schemeRow[d === 0 ? 'refuerzo_obs' : `dosis_${d}_obs`] || '',
            targetWorkerId: schemeRow.id
        });
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleRegisterDosis = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Date cannot be in the future
        const todayStr = new Date().toISOString().split('T')[0];
        if (formData.date > todayStr) {
            toast.error('La fecha no puede ser posterior al día de hoy');
            return;
        }

        // Sequential validation rules for new entries
        if (!isEditing) {
            let schemeRow = worker.schemes.find((s: any) => s.id === formData.targetWorkerId);
            if (!schemeRow) schemeRow = worker.schemes.find((s: any) => s.tipo_vacuna === formData.vaccineType);

            if (schemeRow) {
                if (formData.doseNum > 1) {
                    for (let i = 1; i < formData.doseNum; i++) {
                        if (!schemeRow[`dosis_${i}`]) {
                            toast.error(`Acceso Denegado: Por favor registre la Dosis ${i} primero.`);
                            return;
                        }
                    }
                } else if (formData.doseNum === 0) {
                    const config = configs.find(c => c.tipo_vacuna === formData.vaccineType);
                    const req = config ? config.dosis_requeridas : 5;
                    for (let i = 1; i <= req; i++) {
                        if (!schemeRow[`dosis_${i}`]) {
                            toast.error(`Acceso Denegado: Debe completar la Dosis ${i} antes del Refuerzo.`);
                            return;
                        }
                    }
                }

                const fieldName = formData.doseNum === 0 ? 'refuerzo' : `dosis_${formData.doseNum}`;
                if (schemeRow[fieldName]) {
                    toast.error(`Esta dosis ya se encuentra registrada. Utilice el ícono del lápiz (✏️) sobre la etiqueta para editarla.`);
                    return;
                }
            }
        }

        setLoading(true);
        try {
            let targetId = formData.targetWorkerId;

            if (formData.vaccineType === 'TETANOS' && formData.exactVaccineType !== 'TETANOS') {
                const existingExactRow = worker.schemes.find((s: any) => s.tipo_vacuna === formData.exactVaccineType);
                if (existingExactRow) {
                    targetId = existingExactRow.id;
                } else {
                    targetId = '';
                }
            }

            // If it's a new scheme (un-enrolled standard vaccine), create it first
            if (!targetId) {
                const newRow = {
                    no_de_documento: worker.no_de_documento,
                    nombres_apellidos: worker.nombres_apellidos,
                    sexo: worker.sexo,
                    regional: worker.regional,
                    seccional: worker.seccional,
                    cargo: worker.cargo,
                    alergias: worker.alergias,
                    contraindicacion: worker.contraindicacion,
                    "año_activo": worker["año_activo"],
                    estado_servidor: worker.estado_servidor,
                    tipo_vacuna: formData.exactVaccineType || formData.vaccineType
                };
                const result: any = await api.crearTrabajador(newRow);
                const created = Array.isArray(result) ? result[0] : (result.data ? result.data[0] : result);
                targetId = created.id;
                worker.schemes.push(created);
            }

            const field = formData.doseNum === 0 ? 'refuerzo' : `dosis_${formData.doseNum}`;
            const payload: any = {
                field,
                value: formData.date,
                origen: formData.origin,
                responsable: formData.responsable,
                isUpdate: isEditing,
                doseNum: formData.doseNum
            };
            if (formData.observacion) {
                payload.observacion = formData.observacion;
            }

            const result = await api.registrarDosis(targetId, payload);
            const updatedSchemes = worker.schemes.map((s: any) => s.id === result.id ? result : s);
            setWorker({ ...worker, schemes: updatedSchemes });
            toast.success(isEditing ? 'Dosis modificada correctamente' : 'Dosis registrada correctamente');
            setIsModalOpen(false);
        } catch (error: any) {
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNewVaccine) return;
        setEnrolling(true);
        try {
            const finalVacuna = selectedNewVaccine === 'OTRA' ? (customVacunaEnroll.toUpperCase().trim() || 'OTRA') : selectedNewVaccine;

            // Check if there is already an empty row for this vaccine
            const existingEmpty = worker.schemes.find((s: any) =>
                s.tipo_vacuna === finalVacuna &&
                !Boolean(s.dosis_1 || s.dosis_2 || s.dosis_3 || s.dosis_4 || s.dosis_5 || s.refuerzo)
            );

            if (existingEmpty) {
                setRecentlyAdded(prev => new Set(prev).add(existingEmpty.id));
                setIsEnrollModalOpen(false);
                setSelectedNewVaccine('');
                toast.success(`${finalVacuna} agregada al perfil`);
                setEnrolling(false);
                return;
            }

            const newRow = {
                no_de_documento: worker.no_de_documento,
                nombres_apellidos: worker.nombres_apellidos,
                sexo: worker.sexo,
                regional: worker.regional,
                seccional: worker.seccional,
                cargo: worker.cargo,
                alergias: worker.alergias,
                contraindicacion: worker.contraindicacion,
                "año_activo": worker["año_activo"],
                estado_servidor: worker.estado_servidor,
                tipo_vacuna: finalVacuna
            };
            const result: any = await api.crearTrabajador(newRow);
            const created = Array.isArray(result) ? result[0] : (result.data ? result.data[0] : result);
            setRecentlyAdded(prev => new Set(prev).add(created.id));
            setWorker({ ...worker, schemes: [...worker.schemes, created] });
            setIsEnrollModalOpen(false);
            setSelectedNewVaccine('');
            toast.success(`${selectedNewVaccine} agregada al perfil`);
        } catch (error: any) {
            toast.error('Error al agregar esquema: ' + error.message);
        } finally {
            setEnrolling(false);
        }
    };

    const handleProfileEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updates = {
                nombres_apellidos: profileFormData.nombres_apellidos,
                no_de_documento: profileFormData.no_de_documento,
                sexo: profileFormData.sexo,
                regional: profileFormData.regional,
                seccional: profileFormData.seccional,
                "año_activo": profileFormData["año_activo"],
                estado_servidor: profileFormData.estado_servidor
            };

            await api.actualizarTrabajadorGlobal(worker.no_de_documento, {
                updates,
                observacion: profileFormData.observacion
            });

            const updatedSchemes = worker.schemes.map((s: any) => ({ ...s, ...updates }));
            setWorker({ ...worker, ...updates, schemes: updatedSchemes });

            toast.success('Perfil actualizado correctamente');
            setIsProfileEditOpen(false);
        } catch (error: any) {
            toast.error('Error al actualizar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openProfileEdit = () => {
        setProfileFormData({
            nombres_apellidos: worker.nombres_apellidos || '',
            no_de_documento: worker.no_de_documento || '',
            sexo: worker.sexo || '',
            regional: worker.regional || '',
            seccional: worker.seccional || '',
            "año_activo": worker["año_activo"] || '',
            estado_servidor: worker.estado_servidor || '',
            observacion: ''
        });
        setIsProfileEditOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Profile Section */}
            <Card className="p-0 border-0 bg-transparent shadow-none dark:bg-transparent px-4 py-4 mb-4">
                <div className="flex items-start gap-6">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-4">
                                {worker.nombres_apellidos}
                            </h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    className="h-10 w-10 p-0 rounded-xl bg-slate-100 dark:bg-zinc-800/50 hover:bg-primary/10 hover:text-primary transition-all shadow-sm"
                                    onClick={openProfileEdit}
                                >
                                    <Settings size={18} />
                                </Button>
                            </div>
                        </div>
                        <p className="text-primary font-bold text-sm tracking-widest leading-none flex items-center gap-2">
                            <Briefcase size={14} /> {worker.cargo} | <UserPlus size={14} /> {worker.sexo || 'N/A'} | <MapPin size={14} /> {worker.regional} — {worker.seccional}
                        </p>
                        <div className="flex items-center gap-4 pt-2">
                            <div className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 rounded-xl text-base font-black text-slate-700 dark:text-zinc-300 border-2 border-primary/10 shadow-sm transition-all hover:border-primary/30">
                                NO DE DOCUMENTO: <span className="text-primary ml-1">{worker.no_de_documento}</span>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                                worker.estado_servidor?.toLowerCase() === 'activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                            )}>
                                ESTADO: {worker.estado_servidor || 'DESCONOCIDO'}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Medical Context Section */}
            {(worker.alergias && worker.alergias.toLowerCase() !== 'sin alergias') || (worker.contraindicacion && worker.contraindicacion.toLowerCase() !== 'ninguna') ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {worker.alergias && worker.alergias.toLowerCase() !== 'sin alergias' && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex gap-4 animate-slide-in">
                            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl h-fit">
                                <AlertCircle className="text-amber-600 dark:text-amber-50" size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-amber-800 dark:text-amber-400 text-[10px] uppercase tracking-widest mb-1">Alergias</h4>
                                <p className="text-[11px] text-amber-700/80 dark:text-amber-300 leading-relaxed font-bold italic">
                                    {worker.alergias}
                                </p>
                            </div>
                        </div>
                    )}

                    {worker.contraindicacion && worker.contraindicacion.toLowerCase() !== 'ninguna' && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex gap-4 animate-slide-in">
                            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl h-fit">
                                <AlertCircle className="text-rose-600 dark:text-rose-50" size={20} />
                            </div>
                            <div>
                                <h4 className="font-black text-rose-800 dark:text-rose-400 text-[10px] uppercase tracking-widest mb-1">Contraindicaciones</h4>
                                <p className="text-[11px] text-rose-700/80 dark:text-rose-300 leading-relaxed font-bold italic">
                                    {worker.contraindicacion}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {/* Vaccine Scheme */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar size={20} className="text-primary" /> Esquema de Vacunación
                    </h3>
                    <Button variant="secondary" className="h-9 px-4 text-xs font-bold rounded-xl shadow-lg shadow-secondary/20" onClick={() => setIsEnrollModalOpen(true)}>
                        <Plus size={16} className="mr-2" /> Agregar Vacuna
                    </Button>
                </div>

                {configs.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary opacity-50" size={40} />
                    </div>
                ) : (() => {
                    const allSchemesToRender: any[] = [];
                    configs.forEach(c => {
                        const matchingRows = worker.schemes.filter((s: any) => s.tipo_vacuna === c.tipo_vacuna);
                        if (matchingRows.length > 0) {
                            let primaryFound = false;
                            matchingRows.forEach((row: any) => {
                                const hasDoses = Boolean(row.dosis_1 || row.dosis_2 || row.dosis_3 || row.dosis_4 || row.dosis_5 || row.refuerzo);
                                if (!hasDoses && !recentlyAdded.has(row.id)) return;
                                allSchemesToRender.push({ isConfig: true, config: c, schemeRow: row, isAdditional: primaryFound });
                                primaryFound = true;
                            });
                        }
                    });
                    worker.schemes.filter((s: any) => !configs.find(c => c.tipo_vacuna === s.tipo_vacuna)).forEach((row: any) => {
                        const hasDoses = Boolean(row.dosis_1 || row.dosis_2 || row.dosis_3 || row.dosis_4 || row.dosis_5 || row.refuerzo);
                        if (!hasDoses && !recentlyAdded.has(row.id)) return;
                        allSchemesToRender.push({ isConfig: false, config: null, schemeRow: row, isAdditional: false });
                    });

                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                            {allSchemesToRender.map(({ isConfig, config, schemeRow, isAdditional }) => {
                                const tipo_vacuna = isConfig ? config!.tipo_vacuna : schemeRow.tipo_vacuna;
                                const nombre = isConfig ? config!.nombre : schemeRow.tipo_vacuna;
                                const theme = vaccineThemes[tipo_vacuna] || vaccineThemes['DEFAULT'];
                                const status = getEstadoVacuna(schemeRow || {} as any, tipo_vacuna as TipoVacuna, config || undefined);
                                const dosis_requeridas = isConfig ? config!.dosis_requeridas : 5;
                                const requiredDosesArray = Array.from({ length: dosis_requeridas }, (_, i) => i + 1);

                                let lastDateIndex = 0;
                                requiredDosesArray.forEach((d, idx) => {
                                    if (schemeRow && schemeRow[`dosis_${d}`]) lastDateIndex = idx + 1;
                                });

                                return (
                                    <Card key={schemeRow?.id || tipo_vacuna} className={cn(
                                        "flex flex-col h-full overflow-hidden border-2 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] group",
                                        theme.border,
                                        theme.lightBg
                                    )}>
                                        <div className="p-6 flex-1 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-4">
                                                    <div className={cn("p-3 rounded-2xl shadow-inner transition-transform group-hover:rotate-12 duration-300 text-white", theme.bg)}>
                                                        <theme.icon size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-900 dark:text-white text-base tracking-tighter leading-none mb-1.5 flex items-center gap-2">
                                                            {nombre.replace(/_/g, ' ')}
                                                            {isAdditional && <Badge variant="neutral" className="text-[8px] px-1.5">REGISTRO ADICIONAL</Badge>}
                                                        </h4>
                                                        <div className="flex items-center gap-3">
                                                            <Badge className="px-2 py-0.5 text-[9px] font-black italic tracking-tigh" variant={
                                                                status.estado === 'VERDE' ? 'success' :
                                                                    status.estado === 'NARANJA' ? 'warning' : 'error'
                                                            }>
                                                                {status.detalle}
                                                            </Badge>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">• {dosis_requeridas} dosis totales</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1.5 grayscale group-hover:grayscale-0 transition-all duration-300">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-800" onClick={() => openRegisterModal(tipo_vacuna, schemeRow?.id)}>
                                                        <Plus size={18} />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-800">
                                                        <MoreVertical size={18} />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="relative pt-2 px-2 pb-4">
                                                <div className="absolute top-6 left-10 right-10 h-[2px] bg-slate-100 dark:bg-zinc-800/50 shadow-inner" />
                                                <div className="flex justify-between w-full relative z-10">
                                                    {requiredDosesArray.map((d, idx) => {
                                                        const date = schemeRow ? schemeRow[`dosis_${d}`] : null;
                                                        const isExterno = schemeRow ? schemeRow.origen_aplicacion === 'PRIVADO' : false;
                                                        let stepStatus: 'completed' | 'current' | 'future' | 'navy' = 'future';
                                                        if (date) stepStatus = isExterno ? 'navy' : 'completed';
                                                        else if (idx === lastDateIndex) stepStatus = 'current';

                                                        return (
                                                            <TimelineItem
                                                                key={d}
                                                                doseNum={d}
                                                                date={date}
                                                                status={stepStatus}
                                                                label={idx === 0 ? "INICIAL" : (idx === requiredDosesArray.length - 1 ? "FINAL" : `DOSIS ${d}`)}
                                                                onEdit={date ? () => openEditModal(schemeRow, tipo_vacuna, d) : undefined}
                                                            />
                                                        );
                                                    })}
                                                    {(!isConfig || config?.meses_refuerzo) && (
                                                        <TimelineItem
                                                            doseNum={0}
                                                            date={schemeRow?.refuerzo}
                                                            status={schemeRow?.refuerzo ? 'completed' : (lastDateIndex === requiredDosesArray.length ? 'current' : 'future')}
                                                            label="REFUERZO"
                                                            onEdit={schemeRow?.refuerzo ? () => openEditModal(schemeRow, tipo_vacuna, 0) : undefined}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dynamic Status Banner */}
                                        <div className={cn(
                                            "px-6 py-3 border-t flex items-center gap-3 transition-colors duration-300",
                                            status.estado === 'VERDE' ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/50" :
                                                status.estado === 'NARANJA' ? "bg-amber-50 dark:bg-amber-900/20 border-amber-100/50 dark:border-amber-900/50" :
                                                    "bg-rose-50 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/50"
                                        )}>
                                            <div className={cn(
                                                "p-1.5 rounded-lg",
                                                status.estado === 'VERDE' ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" :
                                                    status.estado === 'NARANJA' ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" :
                                                        "text-rose-600 bg-rose-100 dark:bg-rose-900/30"
                                            )}>
                                                {status.estado === 'VERDE' ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                                            </div>
                                            <p className={cn(
                                                "text-[10px] font-bold tracking-tight leading-snug italic",
                                                status.estado === 'VERDE' ? "text-emerald-800/80 dark:text-emerald-400" :
                                                    status.estado === 'NARANJA' ? "text-amber-800/80 dark:text-amber-400" :
                                                        "text-rose-800/80 dark:text-rose-400"
                                            )}>
                                                {status.estado === 'VERDE' ? `Cumplimiento Óptimo: Esquema al día para ${nombre}. No se requieren acciones inmediatas.` :
                                                    status.estado === 'NARANJA' ? `Atención Requerida: Próxima dosis de ${nombre} pendiente. Programe su aplicación pronto.` :
                                                        `¡Alerta Crítica!: ${nombre} presenta retraso significativo. Acción prioritaria requerida.`}
                                            </p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>

            {/* Modals remain same as before for functionality */}
            {isEnrollModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-sm glass-card relative overflow-visible shadow-2xl">
                        <button onClick={() => setIsEnrollModalOpen(false)} className="absolute -top-2 -right-2 bg-white dark:bg-zinc-900 p-2 rounded-full shadow-lg text-slate-400 hover:text-slate-600 transition-transform hover:scale-110">
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-secondary/10 rounded-xl text-secondary">
                                <Plus size={20} />
                            </div>
                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Agregar Vacuna</h3>
                        </div>
                        <form onSubmit={handleEnroll} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Nombre de la Vacuna</label>
                                <select
                                    className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-transparent"
                                    value={selectedNewVaccine}
                                    onChange={(e) => setSelectedNewVaccine(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Seleccione...</option>
                                    {configs.map(c => {
                                        const yaRegistrado = worker.schemes.some((s: any) => s.tipo_vacuna === c.tipo_vacuna && (s.dosis_1 || recentlyAdded.has(s.id)));
                                        return <option key={c.tipo_vacuna} value={c.tipo_vacuna} disabled={yaRegistrado}>{c.nombre}</option>;
                                    })}
                                    <option value="OTRA">OTRA (Personalizada)</option>
                                </select>
                            </div>
                            {selectedNewVaccine === 'OTRA' && <Input placeholder="Ej: Neumococo..." value={customVacunaEnroll} onChange={(e) => setCustomVacunaEnroll(e.target.value)} required />}
                            <div className="pt-4 flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={enrolling || !selectedNewVaccine} className="px-8 shadow-lg shadow-primary/20">
                                    {enrolling ? <Loader2 size={16} className="animate-spin" /> : 'Agregar'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-lg glass-card relative overflow-visible shadow-2xl">
                        <button onClick={() => setIsModalOpen(false)} className="absolute -top-2 -right-2 bg-white dark:bg-zinc-900 p-2 rounded-full shadow-lg text-slate-400 hover:text-red-500 transition-all">
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter">{isEditing ? 'Modificar Registro' : 'Registrar Aplicación'}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formData.doseNum === 0 ? 'Refuerzo' : `Dosis ${formData.doseNum}`} • {formData.vaccineType.replace(/_/g, ' ')}</p>
                            </div>
                        </div>
                        <form onSubmit={handleRegisterDosis} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Dosis</label>
                                    <select className="w-full h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-zinc-800 bg-transparent" value={formData.doseNum} onChange={e => setFormData({ ...formData, doseNum: Number(e.target.value) })} disabled={isEditing}>
                                        {Array.from({ length: configs.find(c => c.tipo_vacuna === formData.vaccineType)?.dosis_requeridas || 5 }, (_, i) => i + 1).map(d => (
                                            <option key={d} value={d}>Dosis {d}</option>
                                        ))}
                                        {(!configs.find(c => c.tipo_vacuna === formData.vaccineType) || configs.find(c => c.tipo_vacuna === formData.vaccineType)?.meses_refuerzo) && <option value={0}>Refuerzo</option>}
                                    </select>
                                </div>
                                <Input label="Fecha" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Origen</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={() => setFormData({ ...formData, origin: 'OPS' })} className={cn("px-4 py-2 rounded-xl border text-xs font-bold transition-all", formData.origin === 'OPS' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500')}>REGIONAL (OPS)</button>
                                    <button type="button" onClick={() => setFormData({ ...formData, origin: 'PRIVADO' })} className={cn("px-4 py-2 rounded-xl border text-xs font-bold transition-all", formData.origin === 'PRIVADO' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500')}>PRIVADO</button>
                                </div>
                            </div>
                            <Input label="Responsable" placeholder="Nombre..." value={formData.responsable} onChange={e => setFormData({ ...formData, responsable: e.target.value })} required />
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">{isEditing ? 'Motivo (Requerido)' : 'Observaciones'}</label>
                                <textarea className="w-full p-4 rounded-xl text-sm border border-slate-200 dark:border-zinc-800 bg-transparent min-h-[80px] resize-none" placeholder={isEditing ? "Motivo..." : "Detalles..."} value={formData.observacion} onChange={e => setFormData({ ...formData, observacion: e.target.value })} required={isEditing} />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-zinc-800">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">{loading ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? 'Guardar' : 'Registrar')}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {isProfileEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <Card className="w-full max-w-2xl glass-card relative overflow-visible shadow-2xl">
                        <button onClick={() => setIsProfileEditOpen(false)} className="absolute -top-2 -right-2 bg-white dark:bg-zinc-900 p-2 rounded-full shadow-lg text-slate-400 hover:text-red-500 transition-all">
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary"><Settings size={20} /></div>
                            <h3 className="text-lg font-black uppercase italic tracking-tighter">Peril Global</h3>
                        </div>
                        <form onSubmit={handleProfileEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Nombres" value={profileFormData.nombres_apellidos} onChange={e => setProfileFormData({ ...profileFormData, nombres_apellidos: e.target.value })} required />
                                <Input label="Documento" value={profileFormData.no_de_documento} onChange={e => setProfileFormData({ ...profileFormData, no_de_documento: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Sexo</label>
                                    <select
                                        className="w-full h-11 px-4 rounded-xl text-sm transition-all focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-transparent"
                                        value={profileFormData.sexo}
                                        onChange={e => setProfileFormData({ ...profileFormData, sexo: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Seleccione sexo...</option>
                                        <option value="MASCULINO">MASCULINO</option>
                                        <option value="FEMENINO">FEMENINO</option>
                                        <option value="OTRO">OTRO</option>
                                    </select>
                                </div>
                            </div>
                            {/* Rest of profile form remains standard */}
                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-zinc-800">
                                <Button variant="ghost" onClick={() => setIsProfileEditOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/20">{loading ? <Loader2 size={16} className="animate-spin" /> : 'Actualizar'}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default WorkerProfileTimeline;
