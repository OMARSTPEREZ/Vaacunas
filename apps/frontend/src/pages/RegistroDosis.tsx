import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UI';
import {
    Search,
    UserPlus,
    ArrowLeft,
    Loader2,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Calendar
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
    const [expandedDnis, setExpandedDnis] = useState<Set<string>>(new Set());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalResults, setTotalResults] = useState(0);

    const toggleExpand = (dni: string) => {
        const next = new Set(expandedDnis);
        if (next.has(dni)) next.delete(dni);
        else next.add(dni);
        setExpandedDnis(next);
    };

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
        no_de_documento: '',
        nombres_apellidos: '',
        sexo: '',
        regional: '',
        seccional: '',
        cargo: '',
        alergias: '',
        contraindicacion: '',
        "año_activo": new Date().getFullYear(),
        estado_servidor: 'activo',
        tipo_vacuna: 'NO_INICIADO'
    });

    const seccionalesBase = React.useMemo(() => {
        return newWorker.regional ? regionalSeccionalMap[newWorker.regional] || [] : [];
    }, [newWorker.regional]);

    useEffect(() => {
        setNewWorker(prev => ({ ...prev, seccional: '' }));
    }, [newWorker.regional]);

    const loadPatients = async (query: string = '', page: number = 0, size: number = 10) => {
        setLoading(true);
        setHasSearched(true);
        try {
            const from = page * size;
            const to = from + size - 1;

            const response = await api.buscarPacientes(query && query.trim() ? { query, from, to } : { from, to });

            const groupedMap = (response.data || []).reduce((acc: any, current: any) => {
                if (!acc[current.no_de_documento]) {
                    acc[current.no_de_documento] = { ...current, schemes: [] };
                }
                acc[current.no_de_documento].schemes.push(current);
                return acc;
            }, {});

            const grouped = Object.values(groupedMap);
            setResults(grouped as any[]);
            setTotalResults(response.count || 0);
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
        // Skip initial load if we have a DNI from URL, as it has its own logic
        if (dniFromUrl) return;

        // Reset to page 0 whenever search query changes
        setCurrentPage(0);

        const debounceTimer = setTimeout(() => {
            loadPatients(searchQuery, 0, pageSize);
        }, 500);

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, pageSize]);

    useEffect(() => {
        if (hasSearched && !searchQuery.trim()) return; // Prevent loop if just clearing
        if (currentPage > 0) { // Only trigger for pagination changes
            loadPatients(searchQuery, currentPage, pageSize);
        }
    }, [currentPage]);

    useEffect(() => {
        if (dniFromUrl) {
            setSearchQuery(dniFromUrl);
            loadPatients(dniFromUrl, 0, pageSize).then((fetchedResults) => {
                if (fetchedResults && fetchedResults.length > 0) {
                    setSelectedWorker(fetchedResults[0]);
                }
            });
        } else {
            loadPatients('', 0, pageSize);
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
                <div className="max-w-6xl mx-auto mb-8 flex items-center justify-between animate-in fade-in pt-4">
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
                <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 pt-12">
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

                    {/* Results Table Section */}
                    {hasSearched && (
                        <div className="glass-card rounded-2xl overflow-hidden shadow-xl border-slate-200/50 dark:border-white/5 relative z-10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100/30 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/10 uppercase font-black text-[11px] tracking-wider text-slate-500">
                                            <th className="px-6 py-5">No de Documento</th>
                                            <th className="px-6 py-5">Nombre Completo</th>
                                            <th className="px-6 py-5">Regional / Seccional</th>
                                            <th className="px-6 py-5">Cargo</th>
                                            <th className="px-6 py-5 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white/30 dark:bg-transparent">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                                    <Loader2 className="animate-spin inline-block mr-2" size={20} /> Cargando pacientes...
                                                </td>
                                            </tr>
                                        ) : results.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center">
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
                                            results.map(worker => {
                                                const isExpanded = expandedDnis.has(worker.no_de_documento);

                                                return (
                                                    <React.Fragment key={worker.id}>
                                                        <tr
                                                            className={`transition-all duration-300 border-b border-slate-100 dark:border-white/5 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/5 ${isExpanded ? 'bg-white dark:bg-zinc-900 shadow-sm' : ''}`}
                                                            onClick={() => toggleExpand(worker.no_de_documento)}
                                                        >
                                                            <td className="px-6 py-6 font-black text-slate-800 dark:text-white text-base">
                                                                {worker.no_de_documento}
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="font-extrabold text-slate-800 dark:text-white uppercase text-[13px] tracking-tight">
                                                                        {worker.nombres_apellidos}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="font-black text-slate-800 dark:text-white text-[11px] mb-0.5 uppercase">{worker.regional}</div>
                                                                <div className="font-bold text-slate-400 dark:text-slate-500 text-[10px] uppercase">{worker.seccional}</div>
                                                            </td>
                                                            <td className="px-6 py-6 font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-tighter">
                                                                {worker.cargo}
                                                            </td>
                                                            <td className="px-6 py-6 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleSelectWorker(worker); }}
                                                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition-all border border-orange-200/50 dark:border-orange-500/20"
                                                                    >
                                                                        FICHA <Eye size={14} />
                                                                    </button>
                                                                    <div className={`ml-2 p-1.5 rounded-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                                                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-slate-50/30 dark:bg-black/10 animate-in fade-in duration-300 border-none">
                                                                <td colSpan={5} className="px-12 py-10 border-none">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
                                                                        {/* Esquema de Vacunación */}
                                                                        <div className="space-y-6">
                                                                            <h4 className="flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-[2px]">
                                                                                <CheckCircle2 size={14} /> Esquema de Vacunación
                                                                            </h4>
                                                                            <div className="space-y-5">
                                                                                {(worker.schemes || []).map((scheme: any, i: number) => {
                                                                                    const schemeDoses = [
                                                                                        scheme.dosis_1, scheme.dosis_2,
                                                                                        scheme.dosis_3, scheme.dosis_4,
                                                                                        scheme.dosis_5, scheme.refuerzo
                                                                                    ].filter(Boolean).length;

                                                                                    const totalTarget = scheme.tipo_vacuna === 'TETANOS' ? 6 : (scheme.tipo_vacuna === 'HEPATITIS_B' ? 3 : 1);

                                                                                    let label = scheme.tipo_vacuna;
                                                                                    if (scheme.tipo_vacuna === 'TETANOS') {
                                                                                        const variants = new Set<string>();
                                                                                        ['dosis_1_tipo_vacuna', 'dosis_2_tipo_vacuna', 'dosis_3_tipo_vacuna', 'dosis_4_tipo_vacuna', 'dosis_5_tipo_vacuna', 'refuerzo_tipo_vacuna'].forEach(k => {
                                                                                            if (scheme[k]) variants.add(scheme[k]);
                                                                                        });
                                                                                        if (variants.size > 0) {
                                                                                            label = `TÉTANOS / ${Array.from(variants).join(' / ')}`;
                                                                                            if (variants.has('TETANOS') && variants.size === 1) label = 'TÉTANOS';
                                                                                            else if (!variants.has('TETANOS')) label = Array.from(variants).join(' / ');
                                                                                        }
                                                                                    }

                                                                                    return (
                                                                                        <div key={i} className="space-y-2">
                                                                                            <div className="flex justify-between items-end">
                                                                                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{label}</span>
                                                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{schemeDoses} de {totalTarget} dosis</span>
                                                                                            </div>
                                                                                            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                                                                                <div
                                                                                                    className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                                                                                    style={{ width: `${Math.min((schemeDoses / totalTarget) * 100, 100)}%` }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>

                                                                        {/* Últimas Aplicaciones */}
                                                                        <div className="space-y-6">
                                                                            <h4 className="flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-[2px]">
                                                                                <Calendar size={14} /> ÚLTIMAS APLICACIONES
                                                                            </h4>
                                                                            <div className="space-y-4">
                                                                                {(() => {
                                                                                    const allDoses: any[] = [];
                                                                                    (worker.schemes || []).forEach((scheme: any) => {
                                                                                        [1, 2, 3, 4, 5, 'refuerzo'].forEach(n => {
                                                                                            const dateKey = n === 'refuerzo' ? 'refuerzo' : `dosis_${n}`;
                                                                                            const typeKey = n === 'refuerzo' ? 'refuerzo_tipo_vacuna' : `dosis_${n}_tipo_vacuna`;
                                                                                            if (scheme[dateKey]) {
                                                                                                allDoses.push({
                                                                                                    date: scheme[dateKey],
                                                                                                    type: scheme[typeKey] || scheme.tipo_vacuna,
                                                                                                    num: n === 'refuerzo' ? 'R' : n
                                                                                                });
                                                                                            }
                                                                                        });
                                                                                    });

                                                                                    const latestDosesMap = new Map<string, any>();
                                                                                    allDoses.forEach(dose => {
                                                                                        const existing = latestDosesMap.get(dose.type);
                                                                                        if (!existing || new Date(dose.date) > new Date(existing.date)) {
                                                                                            latestDosesMap.set(dose.type, dose);
                                                                                        }
                                                                                    });

                                                                                    const sortedDoses = Array.from(latestDosesMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                                                                    return (
                                                                                        <>
                                                                                            {sortedDoses.map((dose, idx) => (
                                                                                                <div key={idx} className="flex justify-between items-center group">
                                                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-slate-600 transition-colors">
                                                                                                        {dose.type} (D{dose.num})
                                                                                                    </span>
                                                                                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                                                                                                        {new Date(dose.date).toLocaleDateString()}
                                                                                                    </span>
                                                                                                </div>
                                                                                            ))}
                                                                                            {sortedDoses.length === 0 && (
                                                                                                <div className="text-[10px] font-bold text-slate-400 italic">Sin registros de aplicación</div>
                                                                                            )}
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer/Pagination */}
                            <div className="bg-slate-50/80 dark:bg-white/5 px-6 py-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Total: {totalResults} personas
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Mostrar:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(0);
                                            }}
                                            className="bg-transparent border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary/30"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                        disabled={currentPage === 0 || loading}
                                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, Math.ceil(totalResults / pageSize)) }, (_, i) => {
                                            const totalPages = Math.ceil(totalResults / pageSize);
                                            let pageNum = i;
                                            if (totalPages > 5) {
                                                if (currentPage > 2) pageNum = Math.min(currentPage - 2 + i, totalPages - 5 + i);
                                            }

                                            if (pageNum >= totalPages) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                                                        }`}
                                                >
                                                    {pageNum + 1}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                        disabled={(currentPage + 1) * pageSize >= totalResults || loading}
                                        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {isCreating && (
                <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 relative z-10 pt-12 pb-12">
                    <Card className="glass-card p-10">
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
                                value={newWorker.no_de_documento}
                                onChange={(e) => setNewWorker({ ...newWorker, no_de_documento: e.target.value })}
                            />
                            <Input
                                label="Nombres y Apellidos"
                                placeholder="Nombre completo"
                                required
                                value={newWorker.nombres_apellidos}
                                onChange={(e) => setNewWorker({ ...newWorker, nombres_apellidos: e.target.value })}
                            />
                            <div className="md:col-span-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] block mb-2 px-1">Sexo</label>
                                <select
                                    className="w-full h-11 px-4 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-transparent text-slate-800 dark:text-white"
                                    value={newWorker.sexo}
                                    onChange={(e) => setNewWorker({ ...newWorker, sexo: e.target.value })}
                                    required
                                >
                                    <option value="" disabled className="bg-white dark:bg-zinc-900">Seleccione sexo...</option>
                                    <option value="MASCULINO" className="bg-white dark:bg-zinc-900">MASCULINO</option>
                                    <option value="FEMENINO" className="bg-white dark:bg-zinc-900">FEMENINO</option>
                                    <option value="OTRO" className="bg-white dark:bg-zinc-900">OTRO</option>
                                </select>
                            </div>
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
                                    value={newWorker.contraindicacion || ''}
                                    onChange={(e) => setNewWorker({ ...newWorker, contraindicacion: e.target.value })}
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
                </div>
            )}

            {selectedWorker && !isCreating && (
                <div className="animate-in slide-in-from-bottom-4 max-w-6xl mx-auto pb-12">
                    <WorkerProfileTimeline worker={selectedWorker} />
                </div>
            )}
        </div>
    );
};

export default RegistroDosis;

