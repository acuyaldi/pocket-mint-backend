"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DeleteTransactionModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTransactionModal({ isOpen, isDeleting, onClose, onConfirm }: DeleteTransactionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="delete-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!isDeleting) onClose(); }}
        >
          <motion.div
            key="delete-modal-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm mx-4"
          >
            <Card className="border shadow-2xl" style={{ backgroundColor: "#1E293B", borderColor: "#334155" }}>
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="size-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
                    <Trash2 className="size-5" style={{ color: "#EF4444" }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>
                      Delete Transaction?
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>
                      Deleting a transaction will reverse the wallet balance. This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { if (!isDeleting) onClose(); }}
                      disabled={isDeleting}
                      className="flex-1 h-11 transition-all"
                      style={{ backgroundColor: "#334155", border: "1px solid #334155", color: "#94A3B8" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={onConfirm}
                      disabled={isDeleting}
                      className="flex-1 h-11 font-medium gap-2"
                      style={{ backgroundColor: "#EF4444", color: "#F8FAFC" }}
                    >
                      {isDeleting ? (<><Loader2 className="size-4 animate-spin" />Deleting...</>) : "Delete"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
