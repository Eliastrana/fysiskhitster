"use client";

import React from "react";

type Props = {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "dark" | "ghost";
};

export default function BouncyButton({
                                         children,
                                         onClick,
                                         disabled,
                                         variant = "primary",
                                     }: Props) {
    const base =
        "inline-flex items-center justify-center select-none rounded-2xl px-5 py-3 font-bold " +
        "transition-transform duration-150 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants: Record<string, string> = {
        primary:
            "bg-cyan-300 text-zinc-900 shadow-lg shadow-black/20 hover:brightness-105",
        dark:
            "bg-black/80 text-white border border-white/20 backdrop-blur shadow-lg shadow-black/30 hover:bg-black/90",
        ghost:
            "bg-white/15 text-white border border-white/25 backdrop-blur hover:bg-white/20",
    };


    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${base} ${variants[variant]}`}
        >
            <span className="translate-y-[0.5px]">{children}</span>
        </button>
    );
}
