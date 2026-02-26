import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card, Button, Input, Badge } from '../components/UI';
import { Settings, Save, AlertCircle, Edit2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VacunaConfig {
    id: string;
    tipo_vacuna: string;
    nombre: string;
    dosis_requeridas: number;
    intervalos: number[];
    meses_refuerzo: number | null;
    es_dosis_unica: boolean;
    updated_at: string;
}

const Configuracion: React.FC = () => {
    const [configs, setConfigs] = useState<VacunaConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<VacunaConfig>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await api.getConfiguracionVacunas();
            setConfigs(data);
        } catch (error) {
            console.error('Error fetching configs:', error);
            toast.error('Error al cargar configuración de vacunas');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (config: VacunaConfig) => {
        setEditingId(config.id);
        setEditForm({
            dosis_requeridas: config.dosis_requeridas,
            meses_refuerzo: config.meses_refuerzo,
            intervalos: [...config.intervalos]
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (id: string) => {
        try {
            setSaving(true);
            await api.updateConfiguracionVacunas(id, editForm);
            toast.success('Configuración actualizada correctamente');
            setEditingId(null);
            fetchConfigs(); // Refresh
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleIntervalChange = (index: number, value: string) => {
        const newIntervalos = [...(editForm.intervalos || [])];
        newIntervalos[index] = parseInt(value) || 0;
        setEditForm({ ...editForm, intervalos: newIntervalos });
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin text-primary opacity-50" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800 dark:text-white flex items-center gap-3">
                        <Settings className="text-primary" size={32} />
                        Configuración Vacunas
                    </h1>
                    <p className="text-slate-500 font-medium">Gestiona los esquemas y reglas de vacunación dinámicamente.</p>
                </div>
            </div>

            <Card className="glass-card shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-zinc-800/50 text-slate-500 uppercase text-xs font-black tracking-widest">
                                <th className="p-4 border-b border-slate-200 dark:border-zinc-800">Vacuna</th>
                                <th className="p-4 border-b border-slate-200 dark:border-zinc-800">Dosis Req.</th>
                                <th className="p-4 border-b border-slate-200 dark:border-zinc-800">Intervalos (Meses)</th>
                                <th className="p-4 border-b border-slate-200 dark:border-zinc-800">Refuerzo (Meses)</th>
                                <th className="p-4 border-b border-slate-200 dark:border-zinc-800 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                            {configs.map((config) => {
                                const isEditing = editingId === config.id;

                                return (
                                    <tr key={config.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                        <td className="p-4 align-top">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">{config.nombre}</div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">{config.tipo_vacuna}</div>
                                            {config.es_dosis_unica && (
                                                <Badge variant="blue" className="mt-2 text-[10px]">Dosis Única</Badge>
                                            )}
                                        </td>

                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={editForm.dosis_requeridas || ''}
                                                    onChange={e => setEditForm({ ...editForm, dosis_requeridas: parseInt(e.target.value) || 1 })}
                                                    className="w-20"
                                                />
                                            ) : (
                                                <div className="font-bold text-slate-700 dark:text-slate-300">{config.dosis_requeridas}</div>
                                            )}
                                        </td>

                                        <td className="p-4 align-top">
                                            {isEditing && !config.es_dosis_unica ? (
                                                <div className="space-y-2">
                                                    {(editForm.intervalos || []).map((interval, idx) => (
                                                        <div key={idx} className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold text-slate-400 w-16">D{idx + 1}→D{idx + 2}:</span>
                                                            <Input
                                                                type="number"
                                                                value={interval}
                                                                onChange={e => handleIntervalChange(idx, e.target.value)}
                                                                className="w-20 h-8 text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {config.es_dosis_unica ? (
                                                        <span className="text-sm text-slate-400 italic">No aplica</span>
                                                    ) : config.intervalos.length > 0 ? (
                                                        config.intervalos.map((interval, idx) => (
                                                            <Badge key={idx} variant="outline" className="text-xs bg-white dark:bg-zinc-900 border-slate-200">
                                                                D{idx + 1}→D{idx + 2}: <strong className="ml-1">{interval}m</strong>
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-slate-400 italic">Sin intervalos</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 align-top">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={editForm.meses_refuerzo || ''}
                                                    onChange={e => setEditForm({ ...editForm, meses_refuerzo: parseInt(e.target.value) || null })}
                                                    className="w-24"
                                                    placeholder="N/A"
                                                />
                                            ) : (
                                                <div className="font-bold text-slate-700 dark:text-slate-300">
                                                    {config.meses_refuerzo ? `${config.meses_refuerzo} meses` : <span className="text-slate-400 italic font-normal">N/A</span>}
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 align-top text-right">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                                                        <X size={16} />
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleSave(config.id)} disabled={saving} className="bg-green-600 hover:bg-green-700">
                                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(config)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 size={14} className="mr-2" />
                                                    Editar
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {configs.length === 0 && !loading && (
                    <div className="p-8 text-center text-slate-500">
                        <AlertCircle className="mx-auto mb-3 opacity-20" size={48} />
                        <p>No se encontraron configuraciones de vacunas.</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Configuracion;
