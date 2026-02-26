import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, User, LogOut } from 'lucide-react';
import Logo from './Logo';

const Header: React.FC = () => {
    const { user, role, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="h-16 glass border-b flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <div className="h-12 flex items-center justify-center text-[#004C97] dark:text-white">
                    {/* Desktop Logo */}
                    <Logo className="h-10 hidden sm:flex" />
                    {/* Mobile Logo (Syringe) */}
                    <Logo collapsed={true} className="h-8 w-8 sm:hidden" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent hidden sm:block">
                    Modelo de Vacunación
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:scale-110 transition-transform"
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                <div className="h-8 w-[1px] bg-slate-200 dark:bg-zinc-700 mx-1"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden xs:block">
                        <p className="text-sm font-semibold leading-none">{user?.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mt-1">
                            {role === 'SUPER_USUARIO' ? 'Super Usuario' : 'Usuario OPS'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-orange-300 flex items-center justify-center text-white border-2 border-white dark:border-zinc-800 shadow-md">
                            <User size={20} />
                        </div>
                        <button
                            onClick={logout}
                            title="Cerrar Sessión"
                            className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
