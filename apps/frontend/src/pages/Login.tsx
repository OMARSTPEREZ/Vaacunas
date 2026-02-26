import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { LogIn } from 'lucide-react';
import logoCompleto from '../assets/logo_completo.png';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            toast.success('Sesión iniciada correctamente');
        } catch (error: any) {
            console.error('Auth error:', error.message);
            toast.error(error.message || 'Error en autenticación');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-900 transition-colors duration-300 relative overflow-hidden">
            {/* Fondo dinámico y estético */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-screen animate-pulse pointer-events-none" />

            <div className="w-full max-w-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-3xl border border-white/50 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-3xl p-8 relative z-10">
                <div className="flex justify-center mb-8">
                    <div className="h-28 w-full flex items-center justify-center bg-white dark:bg-zinc-900/50 rounded-2xl p-4 shadow-xl border border-white/50">
                        <img src={logoCompleto} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">
                        Acceso al Sistema
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
                        Ingresa tus credenciales para continuar
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 block mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            className="w-full h-12 px-4 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-white"
                            placeholder="usuario@institucion.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 block mb-1">Contraseña</label>
                        <input
                            type="password"
                            className="w-full h-12 px-4 rounded-xl text-sm transition-all outline-none focus:ring-2 focus:ring-primary/30 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-white"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Procesando...' : <><LogIn size={18} /> Entrar al Dashboard</>}
                    </button>

                    <div className="text-center pt-4 border-t border-slate-200 dark:border-zinc-800 mt-6">
                        <p className="text-xs text-slate-400">
                            Si no tienes acceso, contacta al administrador del sistema.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
