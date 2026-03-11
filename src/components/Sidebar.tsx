'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import {
    BarChart3,
    Building2,
    Users2,
    Hammer,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronRight,
    HardHat,
    Wallet,
    Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { name: 'Tableau de Bord', href: '/', icon: BarChart3 },
    { name: 'Projets', href: '/projects', icon: Building2 },
    { name: 'Ouvriers', href: '/workers', icon: Users2 },
    { name: 'Matériaux', href: '/materials', icon: Hammer },
    { name: 'Sous-Traitance', href: '/subcontractors', icon: Wrench },
    { name: 'Comptabilité', href: '/finance', icon: Wallet, adminOnly: true },
];

export function Sidebar() {
    const { role, signOut, user } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 left-4 z-40 lg:hidden p-2 bg-white border border-stone-200 rounded-lg shadow-sm"
            >
                <Menu size={18} />
            </button>

            {/* Mobile Background Fade */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={{ x: -300 }}
                animate={{
                    x: 0,
                    width: isOpen ? 240 : 72
                }}
                className={cn(
                    "fixed top-0 left-0 h-screen z-50 bg-[#FDFBF7] border-r border-stone-200/60 transition-all duration-300",
                    !isMobileOpen && "hidden lg:flex flex-col",
                    isMobileOpen && "flex flex-col w-[240px]"
                )}
            >
                {/* Toggle Button for Desktop */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute -right-3 top-16 z-50 p-1 bg-white border border-stone-200 rounded-full shadow-md hover:bg-stone-50 transition-colors hidden lg:block"
                >
                    <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                        <ChevronRight size={12} className="text-stone-500" />
                    </motion.div>
                </button>

                {/* Logo Section */}
                <div className="p-4 pt-6 flex items-center gap-3 h-20 mb-2">
                    <div className="bg-[#c97423] p-2 rounded-lg shadow-sm">
                        <HardHat size={20} className="text-white" />
                    </div>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <h1 className="font-black text-[15px] leading-tight tracking-tight text-stone-900">
                                BTP Intel.
                            </h1>
                            <span className="text-[8px] uppercase font-bold text-stone-400 tracking-[0.15em] mt-0.5">
                                Manager Pro v4
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Navigation Section */}
                <nav className="flex-1 px-3 space-y-1 mt-2">
                    {navItems.filter(item => !item.adminOnly || role === 'admin').map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.name} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all group relative font-bold text-[13px] tracking-tight",
                                    isActive
                                        ? "bg-amber-50 text-[#c97423] shadow-sm border border-amber-100/50"
                                        : "text-stone-500 hover:bg-stone-100/50 hover:text-stone-900"
                                )}>
                                    <item.icon size={18} className={cn(isActive ? "text-[#c97423]" : "text-stone-400 group-hover:scale-105 transition-transform")} />
                                    {isOpen && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}
                                    {!isOpen && (
                                        <div className="absolute left-14 px-2 py-1 bg-stone-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[100] tracking-widest uppercase">
                                            {item.name}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer Section */}
                <div className="p-3 border-t border-stone-100 pb-5 space-y-0.5">
                    <button className="flex items-center gap-3.5 w-full px-3 py-2.5 text-stone-500 font-bold text-[13px] hover:bg-stone-50 rounded-xl transition-all">
                        <Settings size={18} className="text-stone-400" />
                        {isOpen && <span>Réglages</span>}
                    </button>
                    <button 
                        onClick={() => signOut()}
                        className="flex items-center gap-3.5 w-full px-3 py-2.5 text-red-500 font-bold text-[13px] hover:bg-red-50 rounded-xl transition-all"
                    >
                        <LogOut size={18} />
                        {isOpen && <span>Déconnexion</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Close Button for Mobile Open Sidebar */}
            {isMobileOpen && (
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="fixed top-4 right-4 z-50 p-2 bg-stone-900/20 backdrop-blur-md rounded-full text-white lg:hidden"
                >
                    <X size={20} />
                </button>
            )}
        </>
    );
}
