import React from "react";
import { Lock, Wallet, SmartphoneNfc, Phone, X } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  itemName: string;
  tournamentId: string;
  description?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  itemName,
  tournamentId,
  description = "Get TV-quality broadcast graphics for this tournament.",
}: PaymentModalProps) {
  if (!isOpen) return null;

  // 🌟 CENTRALIZED PAYMENT DETAILS - CHANGE THESE ONCE HERE 🌟
  const UPI_ID = "YOUR_UPI_ID@bank";
  const WA_NUMBER = "9702485146";
  const PAYEE_NAME = "CricSyncLive Payment";

  // Auto-generate the dynamic links
  const upiNote = encodeURIComponent(
    `${itemName} - ${tournamentId.substring(0, 8)}`,
  );
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR&tn=${upiNote}`;

  const waMessage = encodeURIComponent(
    `Hi! I just paid ₹${amount} for ${itemName}. My Tournament ID is: ${tournamentId}. Please activate it!`,
  );
  const waLink = `https://wa.me/${WA_NUMBER}?text=${waMessage}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[var(--surface-1)] w-full max-w-md rounded-2xl border border-[var(--border-1)] p-8 shadow-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="w-16 h-16 bg-[var(--accent)]/20 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet size={32} />
        </div>

        <h2 className="text-2xl font-black uppercase text-[var(--foreground)] mb-2 tracking-tight text-center">
          Complete Purchase
        </h2>
        <p className="text-[var(--text-muted)] text-sm font-bold mb-2 text-center">
          Unlock <span className="text-[var(--accent)]">{itemName}</span>
        </p>
        <p className="text-[var(--text-muted)] text-xs text-center mb-6 px-4">
          {description}
        </p>

        <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border-1)] mb-6 text-center">
          <p className="text-[13px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Amount to Pay
          </p>
          <p className="text-4xl font-black text-muted">₹{amount}</p>
        </div>

        <div className="space-y-3">
          <a
            href={upiLink}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <SmartphoneNfc size={18} /> Pay via UPI App
          </a>

          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-[#25D366] text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors shadow-lg"
          >
            <Phone size={18} /> Send Screenshot via WhatsApp
          </a>
        </div>

        <p className="text-[13px] text-[var(--text-muted)] font-bold text-center mt-6 uppercase">
          Activation takes 2-5 minutes after screenshot verification.
        </p>
      </div>
    </div>
  );
}
