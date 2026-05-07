import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Simple floating "assistant" that guides the user through the registration steps.
 * It appears as a small circular button in the bottom‑right corner. Clicking it
 * expands a chat‑style pane with helpful messages.
 */
export default function RegistrationBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<string[]>([
    "👋 Welcome! I'm here to help you set up your ShutliX account.",
    "1️⃣ Fill out your name, email and password.",
    "2️⃣ Provide your organisation code (if you have one).",
    "3️⃣ Verify the OTP sent to your email.",
    "When you’re ready, just click ‘Next Step’!",
  ]);

  const toggle = () => setOpen(!open);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
        aria-label="Open registration assistant"
      >
        {open ? <X size={20} /> : <Bot size={20} />}
      </button>

      {/* Chat pane */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-80 max-w-sm bg-[var(--bg-base)] border border-[var(--border-1)] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-3 bg-brand text-white">
              <span className="font-bold">ShutliX Assistant</span>
              <button onClick={toggle} className="hover:opacity-80"><X size={16} /></button>
            </div>
            <div className="p-3 space-y-3 max-h-64 overflow-y-auto" style={{ color: 'var(--text-1)' }}>
              {messages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Bot size={16} className="flex-shrink-0 text-brand mt-0.5" />
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{msg}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-[var(--border-1)] p-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask a question…"
                className="flex-1 bg-[var(--glass-1)] border border-[var(--border-1)] rounded-lg px-2 py-1 text-sm focus:outline-none"
                disabled
              />
              <button disabled className="text-brand opacity-50"><Send size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
