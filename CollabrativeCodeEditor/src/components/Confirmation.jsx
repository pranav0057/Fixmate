import React from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ConfirmationDialog = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] flex items-center justify-center 
                     bg-black/50 backdrop-blur-md" 
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 border border-gray-700 rounded-2xl w-96 
                       shadow-2xl text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>

            {/* Message */}
            <div className="p-5 text-gray-300 text-sm leading-relaxed">
              {message}
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 px-5 py-3 border-t border-gray-700">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md bg-gray-700 text-gray-300 
                           hover:bg-gray-600 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-md bg-red-600 text-white 
                           hover:bg-red-500 transition-all"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationDialog;