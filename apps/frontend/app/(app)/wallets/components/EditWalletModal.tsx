"use client";

import { useState, FormEvent } from "react";
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
  color: "var(--color-muted-foreground)",
  fontFamily: "var(--font-inter)",
} as const;
const inputStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  color: "var(--color-foreground)",
} as const;

export default function EditWalletModal({
  wallet,
  onClose,
}: {
  wallet: Wallet | null;
  onClose: () => void;
}) {
  if (!wallet) {
    return <Dialog open={false} onOpenChange={() => undefined} />;
  }

  return <EditWalletForm key={wallet.id} wallet={wallet} onClose={onClose} />;
}

function EditWalletForm({
  wallet,
  onClose,
}: {
  wallet: Wallet;
  onClose: () => void;
}) {
  const updateWallet = useUpdateWallet();
  const isDebt = isDebtWallet(wallet.type);

  const [name, setName] = useState(wallet.name);
  const [balance, setBalance] = useState(String(Math.abs(wallet.balance))); // asset: saldo · debt: outstanding (positif)
  const [creditLimit, setCreditLimit] = useState(String(wallet.creditLimit ?? 0));
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      setError(msg ?? "Couldn't save changes. Please try again.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)" }}
      >
        <form onSubmit={handleSubmit}>
          <div
            className="px-6 py-5"
            style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-card)" }}
          >
            <DialogTitle
              className="text-base font-semibold"
              style={{ color: "var(--color-foreground)", fontFamily: "var(--font-hanken)" }}
            >
              Edit Wallet
            </DialogTitle>
            <DialogDescription
              className="text-sm mt-1"
              style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}
            >
              {wallet.name} · {wallet.type}
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
                  style={{ color: "var(--color-muted-foreground)" }}
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
                    style={{ color: "var(--color-muted-foreground)" }}
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
              <p className="text-[11px]" style={{ color: "var(--color-destructive)" }}>{error}</p>
            )}
          </div>

          <div
            className="flex justify-end gap-3 px-6 py-5"
            style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-card)" }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={updateWallet.isPending}
              className="h-9 text-sm font-medium"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateWallet.isPending}
              className="h-9 font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              {updateWallet.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
