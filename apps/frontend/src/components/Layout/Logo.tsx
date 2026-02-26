import React from 'react';
import { Syringe } from 'lucide-react';

interface LogoProps {
    className?: string;
    showText?: boolean;
    collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, showText = true, collapsed = false }) => {
    if (collapsed) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <Syringe className="h-full w-full text-current" strokeWidth={2.5} />
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <svg
                viewBox="0 0 100 100"
                className="h-full w-auto fill-current"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Simplified Vector Representation of Institutional Logo */}
                <path d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C72.1 90 90 72.1 90 50C90 27.9 72.1 10 50 10ZM50 82C32.3 82 18 67.7 18 50C18 32.3 32.3 18 50 18C67.7 18 82 32.3 82 50C82 67.7 67.7 82 50 82Z" />
                <path d="M50 30C39 30 30 39 30 50C30 61 39 70 50 70C61 70 70 61 70 50C70 39 61 30 50 30ZM50 62C43.4 62 38 56.6 38 50C38 43.4 43.4 38 50 38C56.6 38 62 43.4 62 50C62 56.6 56.6 62 50 62Z" />
                <circle cx="50" cy="50" r="6" />
            </svg>
            {showText && (
                <div className="flex flex-col">
                    <span className="text-lg font-black tracking-tighter leading-none text-current">POSITIVA</span>
                    <span className="text-[10px] font-bold tracking-[2px] leading-none text-current opacity-70">FISCALIA</span>
                </div>
            )}
        </div>
    );
};

export default Logo;
