import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Button } from '../components/UI';
import {
    Users,
    CheckCircle2,
    TrendingDown,
    Activity,
    Grid,
    BarChart3,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    PieChart, Pie, ResponsiveContainer,
    Cell, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import { calculateComplianceStats } from '../utils/semaforoVacuna';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

const DashboardVacunas: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [allData, setAllData] = useState<any[]>([]);
    const [totalPacientes, setTotalPacientes] = useState(0);
    const [uniquePacientes, setUniquePacientes] = useState(0);
    const [regionales, setRegionales] = useState<string[]>([]);
    const [seccionales, setSeccionales] = useState<string[]>([]);

    // Filtros
    const [filters, setFilters] = useState({
        regional: '',
        seccional: '',
        tipo_vacuna: '',
        fechaInicio: '',
        fechaFin: ''
    });

    const fetchOptions = useCallback(async (regional?: string) => {
        try {
            const [reg, sec] = await Promise.all([
                api.getDistinctValues('regional'),
                api.getDistinctValues('seccional', regional)
            ]);
            setRegionales(reg);
            setSeccionales(sec);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [result, total, unique] = await Promise.all([
                api.buscarPacientes({}), // Fetch all for local analysis
                api.getTotalPacientesCount(),
                api.getUniquePacientesCount()
            ]);

            setAllData(result.data || []);
            setTotalPacientes(total);
            setUniquePacientes(unique);
            fetchOptions();

        } catch (error: any) {
            toast.error('Error al cargar datos: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [fetchOptions]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Update seccionales when regional changes
    useEffect(() => {
        fetchOptions(filters.regional || undefined);
    }, [filters.regional, fetchOptions]);

    const filteredData = useMemo(() => {
        return allData.filter(p => {
            const matchRegional = !filters.regional || p.regional === filters.regional;
            const matchSeccional = !filters.seccional || p.seccional === filters.seccional;
            const matchTipo = !filters.tipo_vacuna || p.tipo_vacuna === filters.tipo_vacuna;

            // Date filter logic (check if any dose matches the range)
            let matchFecha = true;
            if (filters.fechaInicio || filters.fechaFin) {
                const dates = [p.dosis_1, p.dosis_2, p.dosis_3, p.dosis_4, p.dosis_5, p.refuerzo].filter(Boolean) as string[];
                matchFecha = dates.some(d => {
                    const date = d.split('T')[0];
                    const start = filters.fechaInicio || '0000-00-00';
                    const end = filters.fechaFin || '9999-12-31';
                    return date >= start && date <= end;
                });
            }

            return matchRegional && matchSeccional && matchTipo && matchFecha;
        });
    }, [allData, filters]);

    const stats = useMemo(() => calculateComplianceStats(filteredData), [filteredData]);

    const funnelData = useMemo(() => [
        { name: 'Dosis 1', value: stats.funnel[0] },
        { name: 'Dosis 2', value: stats.funnel[1] },
        { name: 'Dosis 3', value: stats.funnel[2] },
        { name: 'Dosis 4', value: stats.funnel[3] },
        { name: 'Dosis 5', value: stats.funnel[4] },
    ], [stats.funnel]);

    const kpiCards = [
        { label: 'Total Registros', value: totalPacientes, icon: Grid, color: 'text-slate-500', sub: 'Registros duplicados ok' },
        { label: 'Total Personas', value: uniquePacientes, icon: Users, color: 'text-blue-500', sub: 'Individuos únicos' },
        { label: 'Cobertura Total', value: `${stats.coberturaTotal}%`, icon: CheckCircle2, color: 'text-emerald-500', sub: 'Esquema completo' },
        { label: 'Tasa de Abandono', value: `${stats.abandono}%`, icon: TrendingDown, color: 'text-rose-500', sub: 'Sin completar' },
    ];

    if (loading && allData.length === 0) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-500 font-medium animate-pulse uppercase tracking-widest text-xs">Cargando Inteligencia de Datos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header section with Global Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic">DASHBOARD EJECUTIVO</h2>
                    <p className="text-slate-500 dark:text-zinc-400 font-medium">Análisis en tiempo real de cobertura regional y cumplimiento.</p>
                </div>

                <Card className="flex flex-wrap items-center gap-4 p-3 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-slate-200/50">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Regional</span>
                        <select
                            className="bg-transparent text-sm font-bold outline-none border-b-2 border-primary/20 focus:border-primary pb-1 px-1"
                            value={filters.regional}
                            onChange={(e) => setFilters({ ...filters, regional: e.target.value, seccional: '' })}
                        >
                            <option value="">Todas</option>
                            {regionales.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Seccional</span>
                        <select
                            className="bg-transparent text-sm font-bold outline-none border-b-2 border-primary/20 focus:border-primary pb-1 px-1"
                            value={filters.seccional}
                            onChange={(e) => setFilters({ ...filters, seccional: e.target.value })}
                        >
                            <option value="">Todas</option>
                            {seccionales.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-800 hidden sm:block mx-2" />
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Año/Rango</span>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                className="bg-transparent text-xs font-medium outline-none border-b border-primary/10"
                                value={filters.fechaInicio}
                                onChange={(e) => setFilters({ ...filters, fechaInicio: e.target.value })}
                            />
                            <input
                                type="date"
                                className="bg-transparent text-xs font-medium outline-none border-b border-primary/10"
                                value={filters.fechaFin}
                                onChange={(e) => setFilters({ ...filters, fechaFin: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setFilters({ regional: '', seccional: '', tipo_vacuna: '', fechaInicio: '', fechaFin: '' })}>
                        Reset
                    </Button>
                </Card>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card, i) => (
                    <Card key={i} className="relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 border-none shadow-xl bg-white dark:bg-zinc-900">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800 ${card.color} group-hover:scale-110 transition-transform duration-500`}>
                                    <card.icon size={24} />
                                </div>
                                <span className="text-[10px] font-black text-slate-300 dark:text-zinc-700 uppercase tracking-widest">REAL-TIME</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight">{card.label}</h3>
                                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {card.value}
                                </div>
                                <p className="text-[11px] font-medium text-slate-400">{card.sub}</p>
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 h-1 bg-current opacity-20 ${card.color} w-full`} />
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vaccination Funnel */}
                <Card className="p-6 border-none shadow-xl bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <BarChart3 className="text-blue-500" size={20} />
                            </div>
                            <h3 className="font-black uppercase italic tracking-tight text-slate-800 dark:text-white">Embudo de Vacunación</h3>
                        </div>
                        <div className="text-[10px] font-bold bg-blue-500/10 text-blue-600 px-2 py-1 rounded uppercase">Deserción por Dosis</div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} layout="vertical" margin={{ left: 40, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                                    {funnelData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Regional Compliance Heatmap (using Bars) */}
                <Card className="p-6 border-none shadow-xl bg-white dark:bg-zinc-900 text-white">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Activity className="text-emerald-500" size={20} />
                            </div>
                            <h3 className="font-black uppercase italic tracking-tight text-slate-800 dark:text-white">Mapa de Cumplimiento</h3>
                        </div>
                    </div>
                    <div className="h-[350px] overflow-y-auto px-2">
                        <div className="space-y-5">
                            {stats.complianceByRegion.map(({ name, value }) => (
                                <div key={name} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <span>{name}</span>
                                        <span>{value}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                }`}
                                            style={{ width: `${value}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Distribution by Vaccine Type */}
                <Card className="p-6 border-none shadow-xl bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Activity size={20} className="text-indigo-500" />
                            </div>
                            <h3 className="font-black uppercase italic tracking-tight text-slate-800 dark:text-white">Distribución de Vacunas</h3>
                        </div>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.countsByVacuna}
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.countsByVacuna.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Quality Alerts / Top Seccionales */}
                <Card className="p-6 border-none shadow-xl bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-500/10 rounded-lg">
                                <AlertCircle className="text-rose-500" size={20} />
                            </div>
                            <h3 className="font-black uppercase italic tracking-tight text-slate-800 dark:text-white">Alertas de Calidad</h3>
                        </div>
                        <div className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase">
                            {stats.alertasCalidad} Inconsistencias
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                            <p className="text-xs text-slate-500 font-medium mb-3">Registros con esquemas incompletos o saltos de dosis detectados en la base maestra.</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">INCIDENCIA DE ERROR</span>
                                <span className="text-xl font-black text-rose-500">
                                    {filteredData.length > 0 ? ((stats.alertasCalidad / filteredData.length) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Top Seccionales Cumplimiento</h4>
                            <div className="space-y-3">
                                {stats.complianceBySeccional
                                    .slice(0, 5)
                                    .map(({ name, value }, i) => (
                                        <div key={name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-300">0{i + 1}</span>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${value}%` }} />
                                                </div>
                                                <span className="text-[10px] font-black text-blue-600">{value}%</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default DashboardVacunas;
