"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateInstallmentModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: (data: Record<string, unknown>) => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // placeholder: collect form data and call API
    const data = {};
    onSuccess(data);
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Cicilan Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="Nama" required />
          <Input placeholder="Jumlah per bulan" type="number" required />
          <Input placeholder="Durasi (bulan)" type="number" required />
          <DialogFooter>
            <Button type="submit">Simpan</Button>
          <DialogClose>
              <Button variant="outline" onClick={onClose}>Batal</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
