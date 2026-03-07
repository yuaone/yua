"use client";

import { motion } from "framer-motion";
import React from "react";

type Props = {
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
};

export default function IconButton({
  icon,
  onClick,
  className = "",
  disabled = false,
}: Props) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.06 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center rounded-lg
        px-2.5 py-2
        text-black/70
        bg-white/70
        border border-black/10
        shadow-sm
        hover:bg-white/90
        transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {icon}
    </motion.button>
  );
}
