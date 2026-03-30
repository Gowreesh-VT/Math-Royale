import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Terminal, AlertCircle } from "lucide-react";

interface CodeforcesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (handle: string) => Promise<void> | void;
}


const CodeforcesDialog : React.FC<CodeforcesDialogProps> = ({
  isOpen,
  onSubmit,
}) => {
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!handle.trim()) {
      setError("Handle cannot be empty");
      return;
    }

    try {
      setLoading(true);
      await onSubmit(handle);
      setHandle("");
      setError("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to link handle. Try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

 const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    handleSubmit();
  }
};


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-black border border-white/10 rounded-sm shadow-[0_0_50px_rgba(34,197,94,0.1)] relative">
              
              

              {/* Header */}
              <div className="border-b border-white/10 p-6 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
                    <User className="text-primary w-5 h-5" />
                  </div>
                  <h2 className=" text-2xl font-bold text-white font-sans  tracking-tighter">
                    CODEFORCES HANDLE
                  </h2>
                </div>
                <p className="font-ui text-xs text-gray-400 ml-12">
                  Link your codeforces handle to continue
                </p>
              </div>

              {/* Body */}
              <div className="p-6">
                {/* System Message */}
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-sm mb-6">
                  <div className="flex gap-3">
                    <Terminal className="text-primary w-4 h-4 mt-0.5" />
                    <div className="font-mono text-xs text-gray-300">
                      <p>Initializing profile sync...</p>
                      <p className="text-primary">AWAITING_USER_INPUT</p>
                    </div>
                  </div>
                </div>

                {/* Input */}
                <div>
                  <label className="font-ui text-xs font-bold tracking-widest text-gray-400 mb-2 block">
                    CODEFORCES HANDLE
                  </label>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value);
                      setError("");
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your handle"
                    disabled={loading}
                    className="w-full bg-black/50 border border-white/10 text-white px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/50 placeholder:text-gray-600"
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 mt-2 text-red-400 text-xs"
                    >
                      <AlertCircle size={14} />
                      {error}
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6">
                 
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-primary text-black py-3 font-bold shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                  >
                    {loading ? "CONNECTING..." : "CONNECT"}
                  </button>
                </div>

                {/* Footer */}
                <p className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-600 text-center">
                  Your Codeforces data will be synced to track your competitive programming progress.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CodeforcesDialog;
