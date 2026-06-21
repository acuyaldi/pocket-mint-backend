"use client";

import { useState, useRef, useCallback, FormEvent, ChangeEvent } from "react";
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
  Plus,
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
import type { WalletCategory, AssetSubType, DebtSubType } from "../page";

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
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

const formatRpVisual = (value: string): string => {
  if (!value) return "";
  const num = value.replace(/[^0-9]/g, "");
  return new Intl.NumberFormat("id-ID").format(parseInt(num || "0", 10));
};

const colorPresets = [
  { hex: "#10B981", class: "bg-emerald-500" },
  { hex: "#3B82F6", class: "bg-blue-500" },
  { hex: "#8B5CF6", class: "bg-purple-500" },
  { hex: "#EC4899", class: "bg-pink-500" },
  { hex: "#F59E0B", class: "bg-amber-500" },
];

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
  const colorInputRef = useRef<HTMLInputElement>(null);

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
  
  // Color & visual identity
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [walletIcon, setWalletIcon] = useState<"landmark" | "creditcard" | "coins" | "wallet" | "handshake">("wallet");
  const [walletColor, setWalletColor] = useState("#10B981");

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
    setCustomColor(null);
    setWalletColor("#10B981");
    setWalletIcon("wallet");
  }, []);

  const handleCustomColorClick = () => {
    colorInputRef.current?.click();
  };

  const handleCustomColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setWalletColor(color);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const formData = {
      name: walletName.trim(),
      category: classification,
      ...(classification === "asset"
        ? { 
            balance: parseRupiahToNumber(initialBalance),
            subType: selectedAssetSubType || undefined,
          }
        : { 
            creditLimit: parseRupiahToNumber(creditLimit), 
            outstanding: parseRupiahToNumber(currentOutstanding),
            ...(selectedDebtSubType === "paylater" && selectedPaylaterProvider !== "Lainnya +"
              ? { 
                  interestRate: parseFloat(interestRate) || 0,
                  adminFee: parseFloat(adminFee) || 0,
                }
              : {}),
          }),
      color: customColor || walletColor,
      icon: walletIcon,
    };

    console.log("=== WALLET SUBMIT DATA ===", formData);
    onSuccess(formData);
    onClose();
    resetForm();
  };

  const activeColor = customColor || walletColor;

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
        className="max-w-2xl text-white sm:max-w-2xl p-0 overflow-hidden max-h-[85vh] h-[calc(85vh-4rem)] flex flex-col"
        style={{ backgroundColor: "#0F172A", border: "1px solid #334155" }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 shrink-0" style={{ borderBottom: "1px solid #334155", backgroundColor: "#1E293B" }}>
            <DialogTitle className="text-base font-semibold" style={{ color: "#F8FAFC", fontFamily: "var(--font-hanken)" }}>Create New Wallet</DialogTitle>
            <DialogDescription className="text-sm mt-1" style={{ color: "#94A3B8", fontFamily: "var(--font-inter)" }}>Define your wallet identity and configure its settings.</DialogDescription>
          </div>

          {/* Scrollable content section */}
          <div className="p-6 space-y-5 overflow-y-auto pr-2 max-h-[calc(85vh-140px)] min-h-[350px] scroll-smooth">
            
            {/* SECTION 1: CLASSIFICATION */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Classification</label>
              <div className="grid grid-cols-2 gap-3">
                {/* Asset Button */}
                <button
                  type="button"
                  onClick={() => setClassification("asset")}
                  className={cn(
                    "relative flex items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 border-2",
                    classification === "asset"
                      ? "border-[#38BDF8]"
                      : "border-[#334155]"
                  )}
                  style={{
                    backgroundColor: classification === "asset" ? "rgba(56,189,248,0.08)" : "#1E293B",
                    color: classification === "asset" ? "#38BDF8" : "#94A3B8",
                    borderColor: classification === "asset" ? "#38BDF8" : "#334155",
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
                      ? "border-[#38BDF8]"
                      : "border-[#334155]"
                  )}
                  style={{
                    backgroundColor: classification === "debt" ? "rgba(56,189,248,0.08)" : "#1E293B",
                    color: classification === "debt" ? "#38BDF8" : "#94A3B8",
                    borderColor: classification === "debt" ? "#38BDF8" : "#334155",
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
                  Uang dingin, tabungan, atau piutang yang menambah nilai kekayaan bersihmu.
                </p>
                <p className={cn(
                  "text-xs text-muted-foreground transition-all duration-200",
                  classification === "debt" ? "block" : "hidden"
                )}>
                  Fasilitas kredit, kartu, atau pinjaman personal yang wajib dibayar kembali.
                </p>
              </div>
            </div>

            {/* SECTION 2: VISUAL IDENTITY */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Visual Identity</label>
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
                            ? "border-[#38BDF8]"
                            : "border-[#334155]"
                        )}
                        style={{
                          backgroundColor: isActive ? "rgba(56,189,248,0.08)" : "#1E293B",
                          color: isActive ? "#38BDF8" : "#94A3B8",
                          borderColor: isActive ? "#38BDF8" : "#334155",
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
                            ? "border-[#38BDF8]"
                            : "border-[#334155]"
                        )}
                        style={{
                          backgroundColor: isActive ? "rgba(56,189,248,0.08)" : "#1E293B",
                          color: isActive ? "#38BDF8" : "#94A3B8",
                          borderColor: isActive ? "#38BDF8" : "#334155",
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
                  <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Paylater Provider</label>
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
                              ? "border-[#38BDF8]"
                              : "border-[#334155]"
                          )}
                          style={{
                            backgroundColor: isActive ? "rgba(56,189,248,0.08)" : "#1E293B",
                            color: isActive ? "#38BDF8" : "#94A3B8",
                            borderColor: isActive ? "#38BDF8" : "#334155",
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
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Wallet Name</label>
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
                style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }} 
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
                  <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Initial Balance</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "#64748B" }}>Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={initialBalance}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        setInitialBalance(raw ? formatRupiahVisual(raw) : "");
                      }}
                      className="h-11 pl-10 pr-4" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }}
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
                    <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Credit Limit</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "#64748B" }}>Rp</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={creditLimit}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setCreditLimit(raw ? formatRupiahVisual(raw) : "");
                        }}
                        className="h-11 pl-10 pr-4" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Current Outstanding</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold select-none" style={{ color: "#64748B" }}>Rp</span>
                      <Input 
                        type="text" 
                        inputMode="numeric" 
                        placeholder="0" 
                        value={currentOutstanding}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, "");
                          setCurrentOutstanding(raw ? formatRupiahVisual(raw) : "");
                        }}
                        className="h-11 pl-10 pr-4" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }} 
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
                            <label className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Interest Rate (%)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={interestRate}
                              onChange={(e) => setInterestRate(e.target.value)}
                              className="h-11" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }}
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Admin Fee (%)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={adminFee}
                              onChange={(e) => setAdminFee(e.target.value)}
                              className="h-11" style={{ backgroundColor: "#1E293B", border: "1px solid #334155", color: "#F8FAFC" }}
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

            {/* Wallet Color Picker */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold tracking-widest uppercase mb-3" style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}>Wallet Color</label>
              <div className="flex items-center gap-3">
                {colorPresets.map((color) => (
                  <button 
                    key={color.hex} 
                    type="button" 
                    onClick={() => { setCustomColor(null); setWalletColor(color.hex); }} 
                    className={cn(
                      "size-9 rounded-full transition-all duration-200 relative",
                      color.class,
                      activeColor === color.hex ? "ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]" : "opacity-60 hover:opacity-100"
                    )}
                    aria-label={`Select ${color.hex} color`}
                  />
                ))}
                
                {/* Custom Color Button */}
                <button
                  type="button"
                  onClick={handleCustomColorClick}
                  className={cn(
                    "size-9 rounded-full flex items-center justify-center transition-all duration-200",
                    "border-2",
                    customColor ? `border-transparent` : "border-[#334155]"
                  )}
                  style={{ backgroundColor: customColor ? undefined : "#1E293B" }}
                  aria-label="Custom color picker"
                >
                  <Plus className={cn("size-4", customColor ? "text-[#0F172A]" : "text-[#94A3B8]")} />
                </button>

                {/* Hidden native color input */}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={customColor || "#ffffff"}
                  onChange={handleCustomColorChange}
                  className="hidden"
                />
              </div>

              {/* Show custom color preview */}
              {customColor && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mt-2"
                >
                  <div 
                    className="size-5 rounded-full border border-white/20"
                    style={{ backgroundColor: customColor }}
                  />
                  <span className="text-xs text-white/40 font-mono">{customColor}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 flex justify-end gap-3 px-6 py-5 shrink-0" style={{ borderTop: "1px solid #334155", backgroundColor: "#1E293B" }}>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              className="h-9 text-sm font-medium transition-all"
              style={{ color: "#94A3B8" }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="h-9 font-semibold"
              style={{ backgroundColor: "#38BDF8", color: "#0F172A" }}
            >
              Create Wallet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
