import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type Role = 'SUPER_USUARIO' | 'USUARIO_OPS' | 'USUARIO_LECTOR';

interface User {
    id: string;
    name: string;
    role: Role;
    email: string;
}

interface AuthContextType {
    user: User | null;
    role: Role;
    setRole: (role: Role) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>('USUARIO_OPS');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Inicializar estado desde la sesión activa de Supabase
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                mapSupabaseUser(session.user);
            } else {
                setLoading(false);
            }
        });

        // Escuchar cambios de estado (login, logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                mapSupabaseUser(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const mapSupabaseUser = (sbUser: SupabaseUser) => {
        const userRole = (sbUser.user_metadata?.role as Role) || 'USUARIO_OPS';
        const userName = sbUser.user_metadata?.name || sbUser.email || 'Usuario';

        setUser({
            id: sbUser.id,
            email: sbUser.email!,
            name: userName,
            role: userRole
        });
        setRole(userRole);
        setLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, setRole, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
