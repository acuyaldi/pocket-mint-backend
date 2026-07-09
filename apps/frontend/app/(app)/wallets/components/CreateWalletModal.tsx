"use client";

import { useState, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Landmark,
  CreditCard,
  Wallet,
  Banknote,
  Handshake,
  Zap,
  User,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { WalletCategory, AssetSubType, DebtSubType } from "@/src/types/wallet";

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: CreateWalletFormData) => void;
}

export interface CreateWalletFormData {
  name: string;
  category: WalletCategory;
  icon: string;
  balance?: number;
  subType?: AssetSubType | DebtSubType;
  creditLimit?: number;
  outstanding?: number;
  interestRate?: number;
  adminFee?: number;
}

const PAYLATER_PRESETS: Record<string, { interestRate: number; adminFee: number }> = {
  "SPaylater": { interestRate: 2.95, adminFee: 1.00 },
  "Kredivo": { interestRate: 2.60, adminFee: 1.00 },
  "Indodana": { interestRate: 3.00, adminFee: 1.00 },
  "Home Credit": { interestRate: 2.95, adminFee: 1.00 },
  "Akulaku": { interestRate: 1.50, adminFee: 1.00 },
  "Atome": { interestRate: 0.00, adminFee: 2.50 },
  "GoPayLater": { interestRate: 2.00, adminFee: 0.00 },
  "Traveloka": { interestRate: 2.14, adminFee: 1.00 },
  "BRI Ceria": { interestRate: 1.42, adminFee: 0.00 },
  "BCA PayLater": { interestRate: 1.25, adminFee: 0.00 },
  "Mandiri": { interestRate: 1.50, adminFee: 0.00 },
  "Allo": { interestRate: 2.00, adminFee: 1.00 },
};

const POPULAR_PAYLATER_PROVIDERS = [
  "SPaylater", "Kredivo", "Indodana", "Home Credit", 
  "Akulaku", "Atome", "GoPayLater", "Traveloka PayLater", 
  "BRI Ceria", "BCA PayLater", "Mandiri Paylater", "Allo PayLater", "Lainnya +"
];

const parseRupiahToNumber = (value: string): number => {
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
};


const assetIdentityIcons = [
  { id: "bank_account", Icon: Landmark, label: "Bank Account" },
  { id: "e_wallet", Icon: Wallet, label: "E-Wallet" },
  { id: "cash_on_hand", Icon: Banknote, label: "Cash on Hand" },
  { id: "piutang", Icon: Handshake, label: "Piutang" },
];

const debtIdentityIcons = [
  { id: "credit_card", Icon: CreditCard, label: "Credit Card" },
  { id: "paylater", Icon: Zap, label: "Paylater" },
  { id: "utang_personal", Icon: User, label: "Utang Personal" },
  { id: "line_of_credit", Icon: Building2, label: "Line of Credit" },
];

export default function CreateWalletModal({ isOpen, onClose, onSuccess }: CreateWalletModalProps) {
  // Form state
  const [classification, setClassification] = useState<WalletCategory>("asset");
  const [walletName, setWalletName] = useState("");
  
  // Asset-specific fields
  const [initialBalance, setInitialBalance] = useState("");
  
  // Debt-specific fields
  const [creditLimit, setCreditLimit] = useState("");
  const [currentOutstanding, setCurrentOutstanding] = useState("");
  
  // Paylater-specific fields
  const [interestRate, setInterestRate] = useState<string>("");
  const [adminFee, setAdminFee] = useState<string>("");
  
  // Sub-category tracking
  const [selectedAssetSubType, setSelectedAssetSubType] = useState<AssetSubType | null>(null);
  const [selectedDebtSubType, setSelectedDebtSubType] = useState<DebtSubType | null>(null);
  const [selectedPaylaterProvider, setSelectedPaylaterProvider] = useState<string | null>(null);

  // Visual identity
  const [walletIcon, setWalletIcon] = useState<"landmark" | "creditcard" | "coins" | "wallet" | "handshake">("wallet");

  const formatRupiahVisual = (value: string): string => {
    if (!value) return "";
    const rawNumber = value.replace(/\D/g, "");
    if (!rawNumber) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(rawNumber)).replace("IDR", "Rp").trim();
  };

  const handlePaylaterProviderSelect = (providerName: string) => {
    setSelectedPaylaterProvider(providerName);
    setSelectedDebtSubType("paylater");
    
    if (providerName === "Lainnya +") {
      setInterestRate("0");
      setAdminFee("0");
    } else {
      const preset = PAYLATER_PRESETS[providerName];
      if (preset) {
        setInterestRate(preset.interestRate.toString());
        setAdminFee(preset.adminFee.toString());
      }
    }
  };

  const resetForm = useCallback(() => {
    setClassification("asset");
    setWalletName("");
    setInitialBalance("");
    setCreditLimit("");
    setCurrentOutstanding("");
    setInterestRate("");
    setAdminFee("");
    setSelectedAssetSubType(null);
    setSelectedDebtSubType(null);
    setSelectedPaylaterProvider(null);
    setWalletIcon("wallet");
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Preset paylater providers disable the name input, so walletName stays empty —
    // the provider name IS the wallet name.
    const isPresetPaylater =
      classification === "debt" &&
      selectedDebtSubType === "paylater" &&
      !!selectedPaylaterProvider &&
      selectedPaylaterProvider !== "Lainnya +";

    const formData: CreateWalletFormData = {
      name: isPresetPaylater ? selectedPaylaterProvider : walletName.trim(),
      category: classification,
      ...(classification === "asset"
        ? {
            balance: parseRupiahToNumber(initialBalance),
            subType: selectedAssetSubType || undefined,
          }
        : {
            creditLimit: parseRupiahToNumber(creditLimit),
            outstanding: parseRupiahToNumber(currentOutstanding),
            subType: selectedDebtSubType || undefined,
            ...(selectedDebtSubType === "paylater" && selectedPaylaterProvider !== "Lainnya +"
              ? {
                  interestRate: parseFloat(interestRate) || 0,
                  adminFee: parseFloat(adminFee) || 0,
                }
              : {}),
          }),
      icon: walletIcon,
    };

    onSuccess(formData);
    onClose();
    resetForm();
  };

  const paylaterProviderButtons = POPULAR_PAYLATER_PROVIDERS.map((provider) => ({
    name: provider,
    isCustom: provider === "Lainnya +",
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent 
        className="max-w-2xl text-white sm:max-w-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col"
        style={{ backgroundColor: "var(--color-popover)", border: "1px solid var(--color-border)" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-card)" }}>
            <DialogTitle className="text-base font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-hanken)" }}>Create New Wallet</DialogTitle>
            <DialogDescription className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Define your wallet identity and configure its settings.</DialogDescription>
          </div>

          {/* Scrollable content section */}
          <div className="p-6 space-y-5 overflow-y-auto pr-2 max-h-[calc(85vh-140px)] scroll-smooth">
            
            {/* SECTION 1: CLASSIFICATION */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Classification</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Asset Button */}
                <button
                  type="button"
                  onClick={() => setClassification("asset")}
                  className={cn(
                    "relative flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 border-2",
                    classification === "asset"
                      ? "border-brand"
                      : "border-border"
                  )}
                  style={{
                    backgroundColor: classification === "asset" ? "rgba(0,109,54,0.08)" : "var(--color-card)",
                    color: classification === "asset" ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    borderColor: classification === "asset" ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  <Wallet className="size-5" />
                  <span className="font-semibold text-sm">ASSET</span>
                </button>
                
                {/* Debt Button */}
                <button
                  type="button"
                  onClick={() => setClassification("debt")}
                  className={cn(
                    "relative flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 border-2",
                    classification === "debt"
                      ? "border-brand"
                      : "border-border"
                  )}
                  style={{
                    backgroundColor: classification === "debt" ? "rgba(0,109,54,0.08)" : "var(--color-card)",
                    color: classification === "debt" ? "var(--color-primary)" : "var(--color-muted-foreground)",
                    borderColor: classification === "debt" ? "var(--color-primary)" : "var(--color-border)",
                  }}
                >
                  <CreditCard className="size-5" />
                  <span className="font-semibold text-sm">DEBT</span>
                </button>
              </div>
              
              {/* Muted description under each button */}
              <div className="pt-2">
                <p className={cn(
                  "text-xs text-muted-foreground transition-all duration-200",
                  classification === "asset" ? "block" : "hidden"
                )}>
                  Cash, savings, or receivables that add to your net worth.
                </p>
                <p className={cn(
                  "text-xs text-muted-foreground transition-all duration-200",
                  classification === "debt" ? "block" : "hidden"
                )}>
                  Credit facilities, cards, or personal loans you must pay back.
                </p>
              </div>
            </div>

            {/* SECTION 2: VISUAL IDENTITY */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Visual Identity</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {classification === "asset" ? (
                  assetIdentityIcons.map((item) => {
                    const Icon = item.Icon;
                    const isActive = selectedAssetSubType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssetSubType(item.id as AssetSubType);
                          setSelectedDebtSubType(null);
                          setSelectedPaylaterProvider(null);
                          setInterestRate("");
                          setAdminFee("");
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 border-2",
                          isActive
                            ? "border-brand"
                            : "border-border"
                        )}
                        style={{
                          backgroundColor: isActive ? "rgba(0,109,54,0.08)" : "var(--color-card)",
                          color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
                          borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                        }}
                      >
                        <motion.div
                          layoutId={isActive ? "activeIdentityBtn" : undefined}
                          className="p-2 rounded-lg"
                        >
                          <Icon className="size-5" />
                        </motion.div>
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })
                ) : (
                  debtIdentityIcons.map((item) => {
                    const Icon = item.Icon;
                    const isActive = selectedDebtSubType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedDebtSubType(item.id as DebtSubType);
                          setSelectedAssetSubType(null);
                          if (item.id !== "paylater") {
                            setSelectedPaylaterProvider(null);
                            setInterestRate("");
                            setAdminFee("");
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-200 border-2",
                          isActive
                            ? "border-brand"
                            : "border-border"
                        )}
                        style={{
                          backgroundColor: isActive ? "rgba(0,109,54,0.08)" : "var(--color-card)",
                          color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
                          borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                        }}
                      >
                        <motion.div
                          layoutId={isActive ? "activeIdentityBtn" : undefined}
                          className="p-2 rounded-lg"
                        >
                          <Icon className="size-5" />
                        </motion.div>
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* SECTION 3: SUB-IDENTITY PROVIDERS (Only for Paylater) */}
            <AnimatePresence>
              {classification === "debt" && selectedDebtSubType === "paylater" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Paylater Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {paylaterProviderButtons.map((provider) => {
                      const isActive = selectedPaylaterProvider === provider.name;
                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => handlePaylaterProviderSelect(provider.name)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 border-2",
                            isActive
                              ? "border-brand"
                              : "border-border"
                          )}
                          style={{
                            backgroundColor: isActive ? "rgba(0,109,54,0.08)" : "var(--color-card)",
                            color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
                            borderColor: isActive ? "var(--color-primary)" : "var(--color-border)",
                          }}
                        >
                          {provider.name}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Wallet Name */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Wallet Name</label>
              <Input 
                type="text" 
                placeholder={classification === "debt" && !selectedPaylaterProvider ? "e.g. Kredivo, SPaylater" : "e.g. Daily Expenses"}
                value={selectedPaylaterProvider && classification === "debt" && selectedDebtSubType === "paylater" && selectedPaylaterProvider !== "Lainnya +" 
                  ? selectedPaylaterProvider 
                  : walletName} 
                onChange={(e) => {
                  if (!selectedPaylaterProvider || selectedPaylaterProvider === "Lainnya +" || classification !== "debt") {
                    setWalletName(e.target.value);
                  }
                }}
                disabled={!!(classification === "debt" && selectedDebtSubType === "paylater" && selectedPaylaterProvider && selectedPaylaterProvider !== "Lainnya +")}
                required={!selectedPaylaterProvider || selectedPaylaterProvider === "Lainnya +" || classification !== "debt"}
                className="h-11"
                style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} 
              />
            </div>

            {/* Asset Fields */}
            <AnimatePresence>
              {classification === "asset" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Initial Balance</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "var(--color-muted-foreground)" }}>Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setInitialBalance(raw ? formatRupiahVisual(raw) : "");
                      }}
                      className="h-11 pl-10 pr-4" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Debt Fields */}
            <AnimatePresence>
              {classification === "debt" && (
                <>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Credit Limit</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "var(--color-muted-foreground)" }}>Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={creditLimit}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setCreditLimit(raw ? formatRupiahVisual(raw) : "");
                        }}
                        className="h-11 pl-10 pr-4" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Current Outstanding</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "var(--color-muted-foreground)" }}>Rp</span>
                      <Input 
                        type="text" 
                        inputMode="numeric" 
                        placeholder="0" 
                        value={currentOutstanding}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setCurrentOutstanding(raw ? formatRupiahVisual(raw) : "");
                        }}
                        className="h-11 pl-10 pr-4" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }} 
                      />
                    </div>
                  </motion.div>

                  {/* Paylater-specific: Interest Rate & Admin Fee */}
                  <AnimatePresence>
                    {selectedDebtSubType === "paylater" && selectedPaylaterProvider !== "Lainnya +" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Interest Rate (%)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="h-11" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-inter)" }}>Admin Fee (%)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={adminFee}
                              onChange={(e) => setAdminFee(e.target.value)}
                              className="h-11" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Auto-filled based on {selectedPaylaterProvider} default rates. You can edit these values manually.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </AnimatePresence>

          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 shrink-0" style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-card)" }}>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="h-9 text-sm font-medium transition-all"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-9 font-semibold"
              style={{ backgroundColor: "var(--color-primary)", color: "var(--color-primary-foreground)" }}
            >
              Create Wallet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}