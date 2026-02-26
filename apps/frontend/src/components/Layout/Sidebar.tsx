import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logoCompleto from '../../assets/logo_completo.png';
import {
    LayoutDashboard,
    Users,
    FileSearch,
    ChevronLeft,
    ChevronRight,
    ShieldAlert
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Sidebar: React.FC = () => {
    const { role } = useAuth();
    const [collapsed, setCollapsed] = React.useState(false);

    const menuItems = role === 'SUPER_USUARIO'
        ? [
            { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Reportes', path: '/reportes', icon: FileSearch },
            { name: 'Buscador de Pacientes', path: '/registro', icon: Users },
        ]
        : role === 'USUARIO_LECTOR'
            ? [
                { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            ]
            : [
                { name: 'Buscador de Pacientes', path: '/registro', icon: FileSearch },
            ];

    return (
        <aside
            className={cn(
                "glass border-r h-full transition-all duration-300 flex flex-col z-40 relative group",
                collapsed ? "w-20" : "w-64"
            )}
        >
            <div className="p-0 flex items-center justify-center border-b dark:border-zinc-800/50 bg-white dark:bg-zinc-900/10">
                <div className={cn(
                    "transition-all duration-300 flex items-center justify-center overflow-hidden",
                    collapsed ? "h-12 w-12" : "h-24 w-full px-2"
                )}>
                    <img
                        src={logoCompleto}
                        alt="Logo APP"
                        className="h-full w-full object-contain scale-110"
                    />
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-2 mt-4">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all group/item",
                            isActive
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-primary dark:hover:text-primary"
                        )}
                    >
                        <item.icon size={22} className={cn("shrink-0 transition-transform group-hover/item:scale-110")} />
                        {!collapsed && <span className="font-medium">{item.name}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t dark:border-zinc-800">
                <div className={cn(
                    "flex items-center gap-3 p-3 rounded-xl",
                    role === 'SUPER_USUARIO' ? "bg-red-50 dark:bg-red-950/20 text-red-600" :
                        role === 'USUARIO_LECTOR' ? "bg-green-50 dark:bg-green-950/20 text-green-600" :
                            "bg-blue-50 dark:bg-blue-950/20 text-blue-600"
                )}>
                    <ShieldAlert size={20} />
                    {!collapsed && (
                        <span className="text-xs font-bold w-full text-center tracking-widest leading-tight uppercase">
                            {role.replace('_', ' ')}
                        </span>
                    )}
                </div>
            </div>

            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-24 h-6 w-6 rounded-full bg-white dark:bg-zinc-800 border dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-primary shadow-sm z-50 transition-opacity opacity-0 group-hover:opacity-100"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
};

export default Sidebar;
