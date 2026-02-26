import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import {
    Search,
    UserPlus,
    ArrowLeft,
    Loader2,
    Eye,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import WorkerProfileTimeline from '../components/WorkerProfileTimeline';

import { useSearchParams } from 'react-router-dom';

const RegistroDosis: React.FC = () => {
    const [searchParams] = useSearchParams();
    const dniFromUrl = searchParams.get('dni');

    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Static lists for dropdowns to remove DB dependency
    const regionalesBase = [
        "CENTRAL", "CARIBE", "NOROCCIDENTAL", "EJE CAFETERO",
        "CENTRO SUR", "PACIFICO", "NORORIENTAL", "ORINOQUIA", "NIVEL CENTRAL"
    ];

    const regionalSeccionalMap: Record<string, string[]> = {
        "CENTRAL": ["AMAZONAS", "BOGOTÁ", "BOYACÁ", "LA CALERA", "CUNDINAMARCA"],
        "CARIBE": ["ATLÁNTICO", "BOLÍVAR", "CESAR", "GUAJIRA", "MAGDALENA", "SAN ANDRÉS"],
        "NOROCCIDENTAL": ["ANTIOQUIA", "CORDOBA", "MEDELLÍN", "SUCRE"],
        "EJE CAFETERO": ["CALDAS", "CHOCÓ", "QUINDÍO", "RISARALDA"],
        "CENTRO SUR": ["CAQUETÁ", "HUILA", "PUTUMAYO", "TOLIMA"],
        "PACIFICO": ["CALI", "CAUCA", "NARIÑO", "VALLE DEL CAUCA"],
        "NORORIENTAL": ["ARAUCA", "MAGDALENA MEDIO", "NORTE DE SANTANDER", "SANTANDER"],
        "ORINOQUIA": ["CASANARE", "GUAINÍA", "GUAVIARE", "META", "VAUPÉS", "VICHADA"],
        "NIVEL CENTRAL": ["NIVEL CENTRAL"]
    };

    const [customRegional, setCustomRegional] = useState('');
    const [customSeccional, setCustomSeccional] = useState('');

    const [newWorker, setNewWorker] = useState({
        numero_documento: '',
        nombres_apellidos: '',
        regional: '',
        seccional: '',
        cargo: '',
        alergias: '',
        contraindicaciones: '',
        ano_activo: new Date().getFullYear(),
        estado_servidor: 'activo',
        tipo_vacuna: 'NO_INICIADO'
    });

    const seccionalesBase = React.useMemo(() => {
        return newWorker.regional ? regionalSeccionalMap[newWorker.regional] || [] : [];
    }, [newWorker.regional]);

    useEffect(() => {
        setNewWorker(prev => ({ ...prev, seccional: '' }));
    }, [newWorker.regional]);

    const loadPatients = async (query: string = '') => {
        if (!query.trim()) {
            toast.error('Por favor, ingrese un número de documento o nombre');
            return [];
        }
        setLoading(true);
        setHasSearched(true);
        try {
            const response = await api.buscarPacientes(query ? { query } : {});

            const grouped = Object.values((response.data || []).reduce((acc: any, current: any) => {
                if (!acc[current.numero_documento]) {
                    acc[current.numero_documento] = { ...current, schemes: [] };
                }
                acc[current.numero_documento].schemes.push(current);
                return acc;
            }, {}));

            setResults(grouped as any[]);
            setSelectedWorker(null);
            setIsCreating(false);
            return grouped as any[];
        } catch (error: any) {
            toast.error('Error al cargar trabajadores: ' + error.message);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (dniFromUrl) {
            setSearchQuery(dniFromUrl);
            loadPatients(dniFromUrl).then((fetchedResults) => {
                // If we got exactly one worker (grouped by DNI), select it
                if (fetchedResults && fetchedResults.length > 0) {
                    setSelectedWorker(fetchedResults[0]);
                }
            });
        }
    }, [dniFromUrl]);

    const handleSearch = () => {
        loadPatients(searchQuery);
    };

    const handleSelectWorker = (worker: any) => {
        setSelectedWorker(worker);
    };

    const handleCreateWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalRegional = newWorker.regional === 'OTRA' ? (customRegional.toUpperCase().trim() || 'OTRA') : newWorker.regional;
            const finalSeccional = newWorker.seccional === 'OTRA' ? (customSeccional.toUpperCase().trim() || 'OTRA') : newWorker.seccional;
            const payload = { ...newWorker, regional: finalRegional, seccional: finalSeccional };
            const data = await api.crearTrabajador(payload);
            const workerRow = Array.isArray(data) ? data[0] : (data.data ? data.data[0] : data);
            toast.success('Trabajador creado exitosamente');

            const groupedWorker = { ...workerRow, schemes: [workerRow] };
            setSelectedWorker(groupedWorker);
            setIsCreating(false);
        } catch (error: any) {
            toast.error('Error al crear trabajador: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Title Section when viewing timelines or creating to keep context */}
            {(selectedWorker || isCreating) && (
                <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between animate-in fade-in">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {isCreating ? 'Agregar Trabajador' : 'Perfil de Vacunación'}
                        </h2>
                    </div>
                    <Button variant="ghost" onClick={() => { setSelectedWorker(null); setIsCreating(false); }} className="hover:bg-slate-200 dark:hover:bg-zinc-800">
                        <ArrowLeft size={16} className="mr-2" /> Volver a búsqueda
                    </Button>
                </div>
            )}

            {!selectedWorker && !isCreating && (
                <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                    {/* Title Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                        <div className={!hasSearched ? "w-full text-center" : ""}>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic underline decoration-primary/30 underline-offset-8">
                                BUSCADOR DE PACIENTES
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-2xl mx-auto">
                                Ingrese el número de identidad o nombres completos del trabajador para consultar su historial de vacunación.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95 animate-in fade-in zoom-in"
                        >
                            <UserPlus size={20} />
                            Crear nuevo trabajador
                        </button>
                    </div>

                    {/* Search Card (Glassmorphism) */}
                    <section className={!hasSearched ? "glass-card rounded-2xl p-10 shadow-2xl border-2 border-primary/20 max-w-4xl mx-auto" : "glass-card rounded-2xl p-6 shadow-xl"}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                            <div className="md:col-span-9 space-y-3">
                                <label className="text-base font-black text-primary dark:text-primary/80 ml-1 uppercase tracking-widest">No de documento / Nombres y Apellidos</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" size={24} />
                                    <input
                                        className="glass-input w-full pl-14 pr-4 py-5 rounded-2xl text-xl font-bold focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all shadow-inner"
                                        placeholder="Ej: 12345678 o Juan Pérez"
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <button
                                    onClick={handleSearch}
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> Buscar Paciente</>}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Results Table Section - ONLY VISIBLE IF hasSearched IS TRUE AND THERE ARE RESULTS */}
                    {hasSearched && !loading && (
                        <div className="glass-card rounded-2xl overflow-hidden shadow-xl border-slate-200/50 dark:border-white/5 animate-in fade-in slide-in-from-bottom-4 relative z-10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">No de documento</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nombre Completo</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Regional / Seccional</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Cargo</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Estado Vacunación</th>
                                            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white/30 dark:bg-transparent">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                                    <Loader2 className="animate-spin inline-block mr-2" size={20} /> Cargando pacientes...
                                                </td>
                                            </tr>
                                        ) : results.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center">
                                                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">No se encontraron pacientes en los registros.</p>
                                                    <button
                                                        onClick={() => setIsCreating(true)}
                                                        className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 border border-blue-600/30 hover:bg-blue-600/10 px-4 py-2 rounded-lg font-bold text-xs transition-all uppercase tracking-wide"
                                                    >
                                                        <UserPlus size={16} />
                                                        Registrar nuevo trabajador
                                                    </button>
                                                </td>
                                            </tr>
                                        ) : (
                                            results.map(worker => (
                                                <tr key={worker.id} className="glass-card-hover transition-colors group">
                                                    <td className="px-6 py-4 text-sm font-black text-slate-700 dark:text-white">
                                                        {worker.numero_documento}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xs ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                                                                {worker.nombres_apellidos?.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{worker.nombres_apellidos}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{worker.regional}</div>
                                                        <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">{worker.seccional}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                        {worker.cargo}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${worker.estado_servidor === 'activo'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${worker.estado_servidor === 'activo' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-rose-500 dark:bg-rose-400 animate-pulse'
                                                                }`}></span>
                                                            {worker.estado_servidor === 'activo' ? 'Activo' : 'Vencido'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => handleSelectWorker(worker)}
                                                            className="text-[11px] font-black text-primary hover:text-primary/80 flex items-center gap-1.5 transition-all uppercase group-hover:translate-x-1 duration-200 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg"
                                                        >
                                                            Ver Ficha
                                                            <Eye size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer/Pagination */}
                            <div className="bg-slate-50/80 dark:bg-white/5 px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mostrando {results.length} resultados</span>
                                <div className="flex items-center gap-2">
                                    <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all disabled:opacity-30" disabled={true}>
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-primary/30">1</button>
                                    <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isCreating && (
                <Card className="max-w-3xl mx-auto glass-card animate-in slide-in-from-bottom-4 relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <UserPlus className="text-primary" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Crear Nuevo Trabajador</h3>
                            <p className="text-sm text-slate-500 uppercase tracking-widest font-bold opacity-60">Ficha de ingreso institucional</p>
                        </div>
                    </div>
                    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleCreateWorker}>
                        <Input
                            label="No de documento"
                            placeholder="Ej: 1022..."
                            required
                            value={newWorker.numero_documento}
                            onChange={(e) => setNewWorker({ ...newWorker, numero_documento: e.target.value })}
                        />
                        <Input
                            label="Nombres y Apellidos"
                            placeholder="Nombre completo"
                            required
                            value={newWorker.nombres_apellidos}
                            onChange={(e) => setNewWorker({ ...newWorker, nombres_apellidos: e.target.value })}
                        />
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block mb-2 px-1">Regional</label>
                            <select
                                className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-800 dark:text-white"
                                value={newWorker.regional}
                                onChange={(e) => setNewWorker({ ...newWorker, regional: e.target.value })}
                                required
                            >
                                <option value="" disabled className="bg-white dark:bg-zinc-900">Seleccione regional...</option>
                                {regionalesBase.map(r => (
                                    <option key={r} value={r} className="bg-white dark:bg-zinc-900">{r}</option>
                                ))}
                                <option value="OTRA" className="bg-white dark:bg-zinc-900 font-bold bg-slate-50">OTRA (Escribir nueva...)</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block mb-2 px-1">Seccional</label>
                            <select
                                className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-800 dark:text-white"
                                value={newWorker.seccional}
                                onChange={(e) => setNewWorker({ ...newWorker, seccional: e.target.value })}
                                required
                            >
                                <option value="" disabled className="bg-white dark:bg-zinc-900">Seleccione seccional...</option>
                                {seccionalesBase.map(s => (
                                    <option key={s} value={s} className="bg-white dark:bg-zinc-900">{s}</option>
                                ))}
                                <option value="OTRA" className="bg-white dark:bg-zinc-900 font-bold bg-slate-50">OTRA (Escribir nueva...)</option>
                            </select>
                        </div>
                        {newWorker.regional === 'OTRA' && (
                            <div className="md:col-span-1">
                                <Input
                                    label="Dígite el nombre de la Regional"
                                    placeholder="Ej: Antioquia"
                                    value={customRegional}
                                    onChange={(e) => setCustomRegional(e.target.value)}
                                    required={newWorker.regional === 'OTRA'}
                                />
                            </div>
                        )}
                        {newWorker.seccional === 'OTRA' && (
                            <div className="md:col-span-1">
                                <Input
                                    label="Dígite el nombre de la Seccional"
                                    placeholder="Ej: Medellín"
                                    value={customSeccional}
                                    onChange={(e) => setCustomSeccional(e.target.value)}
                                    required={newWorker.seccional === 'OTRA'}
                                />
                            </div>
                        )}
                        <Input
                            label="Cargo"
                            placeholder="Puesto de trabajo"
                            required
                            value={newWorker.cargo}
                            onChange={(e) => setNewWorker({ ...newWorker, cargo: e.target.value })}
                        />
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block mb-2 px-1">Alergias (Obligatorio)</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm min-h-[80px] font-medium"
                                placeholder="Si no tiene, escriba 'Sin alergias'"
                                required
                                value={newWorker.alergias}
                                onChange={(e) => setNewWorker({ ...newWorker, alergias: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block mb-2 px-1">Contraindicaciones</label>
                            <textarea
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm min-h-[80px] font-medium"
                                placeholder="Ej: Antecedente de reacción adversa..."
                                value={(newWorker as any).contraindicaciones || ''}
                                onChange={(e) => setNewWorker({ ...newWorker, ['contraindicaciones']: e.target.value } as any)}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading} className="px-8 shadow-lg shadow-primary/30">
                                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : 'Guardar y Continuar'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {selectedWorker && (
                <div className="animate-in slide-in-from-bottom-4 max-w-6xl mx-auto">
                    <WorkerProfileTimeline worker={selectedWorker} />
                </div>
            )}
        </div>
    );
};

export default RegistroDosis;
