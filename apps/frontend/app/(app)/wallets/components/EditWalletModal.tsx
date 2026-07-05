"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateWallet } from "@/src/features/wallets/hooks/useWallets";
import { isDebtWallet, type Wallet } from "@/src/types/wallet";

const labelStyle = {
  color: "#3d4a3e",
  fontFamily: "var(--font-inter)",
} as const;
const inputStyle = {
  backgroundColor: "#0e0e0e",
  border: "1px solid #262626",
  color: "#e5e2e1",
} as const;

export default function EditWalletModal({
  wallet,
  onClose,
}: {
  wallet: Wallet | null;
  onClose: () => void;
}) {
  const updateWallet = useUpdateWallet();
  const isDebt = wallet ? isDebtWallet(wallet.type) : false;

  const [name, setName] = useState("");
  const [balance, setBalance] = useState(""); // asset: saldo · debt: outstanding (positif)
  const [creditLimit, setCreditLimit] = useState("");
  const [error, setError] = useState("");

  // Prefill whenever a wallet is opened for editing
  useEffect(() => {
    if (!wallet) return;
    setName(wallet.name);
    setBalance(String(Math.abs(wallet.balance)));
    setCreditLimit(String(wallet.creditLimit ?? 0));
    setError("");
  }, [wallet]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setError("");
    try {
      await updateWallet.mutateAsync({
        id: wallet.id,
        name: name.trim(),
        // Debt wallets store outstanding as a negative balance
        balance: isDebt ? -Math.abs(Number(balance) || 0) : Number(balance) || 0,
        ...(isDebt && { creditLimit: Number(creditLimit) || 0 }),
      });
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setError(msg ?? "Gagal menyimpan perubahan. Coba lagi.");
    }
  };

  return (
    <Dialog open={!!wallet} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{ backgroundColor: "#131313", border: "1px solid #262626" }}
      >
        <form onSubmit={handleSubmit}>
          <div
            className="px-6 py-5"
            style={{ borderBottom: "1px solid #262626", backgroundColor: "#0e0e0e" }}
          >
            <DialogTitle
              className="text-base font-semibold"
              style={{ color: "#e5e2e1", fontFamily: "var(--font-hanken)" }}
            >
              Edit Wallet
            </DialogTitle>
            <DialogDescription
              className="text-sm mt-1"
              style={{ color: "#bccabb", fontFamily: "var(--font-inter)" }}
            >
              {wallet?.name} · {wallet?.type}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-widest uppercase" style={labelStyle}>
                Wallet Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11"
                style={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-widest uppercase" style={labelStyle}>
                {isDebt ? "Current Outstanding" : "Balance"}
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none"
                  style={{ color: "#3d4a3e" }}
                >
                  Rp
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value.replace(/\D/g, ""))}
                  className="h-11 pl-10 pr-4"
                  style={inputStyle}
                />
              </div>
            </div>

            {isDebt && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold tracking-widest uppercase" style={labelStyle}>
                  Credit Limit
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none"
                    style={{ color: "#3d4a3e" }}
                  >
                    Rp
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value.replace(/\D/g, ""))}
                    className="h-11 pl-10 pr-4"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="text-[11px]" style={{ color: "#ffb4ab" }}>{error}</p>
            )}
          </div>

          <div
            className="flex justify-end gap-3 px-6 py-5"
            style={{ borderTop: "1px solid #262626", backgroundColor: "#0e0e0e" }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={updateWallet.isPending}
              className="h-9 text-sm font-medium"
              style={{ color: "#bccabb" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateWallet.isPending}
              className="h-9 font-semibold"
              style={{ backgroundColor: "#4ade80", color: "#131313" }}
            >
              {updateWallet.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
