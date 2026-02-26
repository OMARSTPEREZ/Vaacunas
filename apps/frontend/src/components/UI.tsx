import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost', size?: 'default' | 'sm' | 'lg' }>(
    ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
        const variants = {
            primary: 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20',
            secondary: 'bg-secondary text-white hover:bg-blue-800 shadow-md shadow-secondary/20',
            outline: 'border-2 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50',
            ghost: 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400',
        };

        const sizes = {
            default: 'px-4 py-2',
            sm: 'px-3 py-1.5 text-sm',
            lg: 'px-6 py-3 text-lg'
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'rounded-xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
                    sizes[size],
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

export const Card = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('glass-card p-6 overflow-hidden', className)} {...props}>
        {children}
    </div>
);

export const Badge = ({ children, variant = 'neutral', className }: {
    children: React.ReactNode,
    variant?: 'success' | 'warning' | 'error' | 'neutral' | 'primary' | 'navy' | 'blue' | 'outline',
    className?: string
}) => {
    const variants = {
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
        error: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
        navy: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
        neutral: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
        primary: 'bg-primary/10 text-primary border-primary/20',
        outline: 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-400 bg-transparent'
    };

    return (
        <span className={cn('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', variants[variant], className)}>
            {children}
        </span>
    );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(
    ({ label, className, ...props }, ref) => (
        <div className="space-y-1.5 w-full">
            {label && <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest px-1">{label}</label>}
            <input
                ref={ref}
                className={cn(
                    'w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none text-sm',
                    className
                )}
                {...props}
            />
        </div>
    )
);
