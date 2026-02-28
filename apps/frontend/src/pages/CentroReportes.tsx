import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button, Input } from '../components/UI';
import {
    Download,
    FileSpreadsheet,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Database
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { calculateComplianceStats } from '../utils/semaforoVacuna';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 20;

const CentroReportes: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [hasSearched, setHasSearched] = useState(true);
    const [updatingBulk, setUpdatingBulk] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [regionales, setRegionales] = useState<string[]>([]);
    const [seccionales, setSeccionales] = useState<string[]>([]);
    const [vacunas, setVacunas] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        regional: '',
        seccional: '',
        vacuna: '',
        startDate: '',
        endDate: '',
        year: ''
    });

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

    const fetchOptions = useCallback(async (regional?: string) => {
        try {
            const [, sec, vac] = await Promise.all([
                api.getDistinctValues('regional'),
                api.getDistinctValues('seccional', regional),
                api.getDistinctValues('tipo_vacuna')
            ]);

            setRegionales(Object.keys(regionalSeccionalMap));
            setVacunas(vac);

            if (regional && regionalSeccionalMap[regional]) {
                setSeccionales(regionalSeccionalMap[regional]);
            } else {
                setSeccionales(sec);
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const result = await api.buscarPacientes({
                query: searchQuery,
                regional: filters.regional,
                seccional: filters.seccional,
                tipo_vacuna: filters.vacuna,
                from,
                to
            });

            setData(result.data || []);
            setTotalCount(result.count || 0);
        } catch (error: any) {
            toast.error('Error al cargar reportes: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, filters.regional, filters.seccional, filters.vacuna]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBulkUpdate = async () => {
        setUpdatingBulk(true);
        const loadingToast = toast.loading('Recalculando todas las validaciones...');
        try {
            const result = await api.bulkUpdateValidations();
            toast.success(`Se actualizaron ${result.count} registros`, { id: loadingToast });
            fetchData();
        } catch (error: any) {
            toast.error('Error: ' + error.message, { id: loadingToast });
        } finally {
            setUpdatingBulk(false);
        }
    };

    useEffect(() => {
        fetchOptions(filters.regional || undefined);
    }, [filters.regional, fetchOptions]);

    const getEstado = (p: any) => {
        const stats = calculateComplianceStats([p]);
        if (stats.alertasCalidad > 0) return 'Error';
        if (stats.coberturaTotal === 100) return 'Completo';
        return 'Incompleto';
    };

    const applyDatesAndYearFilter = (items: any[]) => {
        return items.filter(p => {
            const dates = [
                p.dosis_1, p.dosis_2, p.dosis_3,
                p.dosis_4, p.dosis_5, p.refuerzo
            ].filter(Boolean) as string[];

            const matchDateRange = (!filters.startDate && !filters.endDate) || dates.some(d => {
                const date = d.split('T')[0];
                const start = filters.startDate || '0000-00-00';
                const end = filters.endDate || '9999-12-31';
                return date >= start && date <= end;
            });

            const matchYear = !filters.year || dates.some(d => d.startsWith(filters.year));

            return matchDateRange && matchYear;
        });
    };

    const downloadFullExcel = (dataset: any[], filename: string) => {
        if (dataset.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        // Define the desired column order and labels mapping
        const columnMap = [
            { key: 'id', label: 'id uuid' },
            { key: 'regional', label: 'regional' },
            { key: 'seccional', label: 'seccional' },
            { key: 'estado_servidor', label: 'estado_servidor' },
            { key: 'año_activo', label: 'año_activo' },
            { key: 'no_de_documento', label: 'no_de_documento' },
            { key: 'nombres_apellidos', label: 'nombres_apellidos' },
            { key: 'sexo', label: 'sexo' },
            { key: 'cargo', label: 'cargo' },
            { key: 'tipo_vacuna', label: 'tipo_vacuna' },
            { key: 'dosis_1', label: 'dosis_1' },
            { key: 'procedencia_1', label: 'procedencia_1' },
            { key: 'dosis_1_obs', label: 'dosis_1_obs' },
            { key: 'dosis_2', label: 'dosis_2' },
            { key: 'procedencia_2', label: 'procedencia_2' },
            { key: 'dosis_2_obs', label: 'dosis_2_obs' },
            { key: 'dosis_3', label: 'dosis_3' },
            { key: 'procedencia_3', label: 'procedencia_3' },
            { key: 'dosis_3_obs', label: 'dosis_3_obs' },
            { key: 'dosis_4', label: 'dosis_4' },
            { key: 'procedencia_4', label: 'procedencia_4' },
            { key: 'dosis_4_obs', label: 'dosis_4_obs' },
            { key: 'dosis_5', label: 'dosis_5' },
            { key: 'procedencia_5', label: 'procedencia_5' },
            { key: 'dosis_5_obs', label: 'dosis_5_obs' },
            { key: 'refuerzo', label: 'refuerzo' },
            { key: 'procedencia_refuerzo', label: 'procedencia_refuerzo' },
            { key: 'refuerzo_obs', label: 'refuerzo_obs' },
            { key: 'alergias', label: 'alergias' },
            { key: 'contraindicacion', label: 'contraindicacion' },
            { key: 'validacion manual observación', label: 'validacion manual observación' },
            { key: 'validación automática', label: 'validación automática' },
            { key: 'creado_por', label: 'creado_por' }
        ];

        const processed = dataset.map(p => {
            const row: any = {};
            columnMap.forEach(col => {
                row[col.label] = p[col.key];
            });
            row['Estado Cobertura'] = getEstado(p);
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(processed);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const exportSelection = async () => {
        toast.loading('Generando reporte filtrado con todas las columnas...');
        try {
            const result = await api.buscarPacientes({
                query: searchQuery,
                regional: filters.regional,
                seccional: filters.seccional,
                tipo_vacuna: filters.vacuna
            });
            const filtered = applyDatesAndYearFilter(result.data || []);
            downloadFullExcel(filtered, 'Reporte_Seleccion_Completo');
            toast.dismiss();
            toast.success('Reporte descargado');
        } catch (e: any) {
            toast.dismiss();
            toast.error('Error: ' + e.message);
        }
    };

    const exportMaster = async () => {
        toast.loading('Generando Base Maestra Completa (esto puede tardar)...');
        try {
            const result = await api.buscarPacientes({});
            downloadFullExcel(result.data || [], 'Base_Maestra_Total');
            toast.dismiss();
            toast.success('Base maestra descargada');
        } catch (e: any) {
            toast.dismiss();
            toast.error('Error: ' + e.message);
        }
    };

    const exportErrors = async () => {
        toast.loading('Exportando listado de errores...');
        try {
            const result = await api.buscarPacientes({});
            const errors = (result.data || []).filter(p => getEstado(p) === 'Error');
            downloadFullExcel(errors, 'Listado_Errores_Completo');
            toast.dismiss();
            toast.success('Errores descargados');
        } catch (e: any) {
            toast.dismiss();
            toast.error('Error: ' + e.message);
        }
    };

    const displayedData = useMemo(() => applyDatesAndYearFilter(data), [data, filters.startDate, filters.endDate, filters.year]);

    return (
        <div className="space-y-6">
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${!hasSearched ? "text-center justify-center p-8" : ""}`}>
                <div className={!hasSearched ? "w-full" : ""}>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic underline decoration-primary/30 underline-offset-8">BUSCADOR DE REPORTES</h2>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm mt-4 font-medium max-w-2xl mx-auto">
                        Seleccione los filtros o ingrese un criterio de búsqueda para generar los listados de vacunación.
                    </p>
                </div>
                {hasSearched && (
                    <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkUpdate}
                            disabled={updatingBulk}
                            className="border-primary/20"
                        >
                            <Database size={14} className={`mr-2 ${updatingBulk ? 'animate-spin' : ''}`} />
                            {updatingBulk ? 'Procesando...' : 'Recalcular Validaciones'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportSelection}>
                            <Download size={14} className="mr-2" /> Selección
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportErrors}>
                            <AlertTriangle size={14} className="mr-2 text-amber-500" /> Errores
                        </Button>
                        <Button size="sm" onClick={exportMaster}>
                            <FileSpreadsheet size={14} className="mr-2" /> Base Maestra
                        </Button>
                    </div>
                )}
            </div>

            <Card className="p-4 transition-all shadow-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3 gap-6 items-end">
                    <div className="lg:col-span-2 xl:col-span-3">
                        <Input
                            label="Buscador Doc/Nombre"
                            placeholder="Cédula o nombre..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-1 block mb-1.5">Regional</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.regional}
                            onChange={(e) => { setFilters({ ...filters, regional: e.target.value, seccional: '' }); setPage(0); }}
                        >
                            <option value="">Todas</option>
                            {regionales.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-1 block mb-1.5">Seccional</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.seccional}
                            onChange={(e) => { setFilters({ ...filters, seccional: e.target.value }); setPage(0); }}
                        >
                            <option value="">Todas</option>
                            {seccionales.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-1 block mb-1.5">Vacuna</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.vacuna}
                            onChange={(e) => { setFilters({ ...filters, vacuna: e.target.value }); setPage(0); }}
                        >
                            <option value="">Todas</option>
                            {vacunas.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-1 block mb-1.5">Año</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.year}
                            onChange={(e) => { setFilters({ ...filters, year: e.target.value }); setPage(0); }}
                        >
                            <option value="">Todos</option>
                            {['2023', '2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div>
                        <Input
                            label="Desde"
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setPage(0); }}
                        />
                    </div>
                    <div>
                        <Input
                            label="Hasta"
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setPage(0); }}
                        />
                    </div>
                    <div className="xl:col-span-1">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setFilters({ regional: '', seccional: '', vacuna: '', startDate: '', endDate: '', year: '' });
                                setSearchQuery('');
                                setPage(0);
                            }}
                        >
                            Limpiar
                        </Button>
                    </div>
                </div>
            </Card>

            {hasSearched && (
                <Card className="overflow-hidden border-none shadow-xl">
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-zinc-800 border-b dark:border-zinc-700">
                                <tr>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400 text-center">Perfil</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400">Documento</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400">Nombre completo</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400">Regional / Seccional</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400 text-center">Esquema</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400 text-center">Última Dosis</th>
                                    <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-widest text-slate-500 dark:text-zinc-400">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-sm">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={7} className="px-4 py-4 h-12 bg-slate-50/50 dark:bg-zinc-800/20"></td>
                                        </tr>
                                    ))
                                ) : displayedData.map((p) => {
                                    const estado = getEstado(p);
                                    const dates = [p.dosis_1, p.dosis_2, p.dosis_3, p.dosis_4, p.dosis_5, p.refuerzo].filter(Boolean) as string[];
                                    const lastDate = dates.length > 0 ? dates[dates.length - 1].split('T')[0] : '-';

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="px-4 py-3 text-center">
                                                <Link to={`/registro?dni=${p.no_de_documento}`} className="text-primary hover:text-primary-dark transition-colors inline-block">
                                                    <ExternalLink size={16} />
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{p.no_de_documento}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{p.nombres_apellidos}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs">{p.regional}</div>
                                                <div className="text-[10px] text-slate-400">{p.seccional}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(d => (
                                                        <div key={d} className={`w-1.5 h-1.5 rounded-full ${p[`dosis_${d}`] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-700'}`} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-slate-500 font-mono">{lastDate}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${estado === 'Completo' ? 'bg-emerald-100 text-emerald-700' :
                                                    estado === 'Error' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {estado}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && displayedData.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                                            No se encontraron registros con los filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-4 py-4 bg-slate-50 dark:bg-zinc-800/50 border-t dark:border-zinc-700 flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Mostrando <span className="font-bold text-primary">{Math.min(displayedData.length, ITEMS_PER_PAGE)}</span> de <span className="font-bold">{totalCount}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 0 || loading}
                                onClick={() => setPage(page - 1)}
                            >
                                <ChevronLeft size={14} />
                            </Button>
                            <span className="text-xs font-medium">Página {page + 1} de {Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={data.length < ITEMS_PER_PAGE || loading}
                                onClick={() => setPage(page + 1)}
                            >
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CentroReportes;
