"use client";

import { AnimatePresence } from "framer-motion";
import WalletItem from "./WalletItem";
import type { WalletItem as WalletType } from "../page";

interface WalletListProps {
  wallets: WalletType[];
  onWalletClick: (wallet: WalletType) => void;
}

export default function WalletList({ wallets, onWalletClick }: WalletListProps) {
  return (
    <AnimatePresence mode="popLayout">
      {wallets.map((w) => (
        <WalletItem
          key={w.id}
          wallet={w}
          onClick={() => onWalletClick(w)}
        />
      ))}
    </AnimatePresence>
  );
}
