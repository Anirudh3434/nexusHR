"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface TransitionErrorPopupProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export default function TransitionErrorPopup({ show, message, onClose }: TransitionErrorPopupProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999]"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px]">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800 flex-1">{message}</p>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
