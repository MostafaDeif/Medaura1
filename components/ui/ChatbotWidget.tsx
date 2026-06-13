"use client";

import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";

export default function ChatbotWidget() {
  const { user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Only show for authenticated patients
  if (!isAuthenticated || user?.user_type?.toLowerCase() !== "patient") {
    return null;
  }

  return (
    <>
      {/* Background Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat Window Card - Anchored to the bottom of the page */}
      {isOpen && (
        <div 
          className="fixed bottom-0 right-0 w-full h-[100dvh] sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[80vh] sm:min-h-[500px] sm:max-h-[800px] sm:rounded-3xl bg-[#0c1322] shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:border border-[#1f2a44] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-300 origin-bottom z-[10000]"
          dir="rtl"
        >
          {/* Floating Close Button overlaying the iframe */}
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Iframe Container */}
          <div className="flex-1 relative w-full h-full">
            <iframe 
              src="https://web-production-d09f.up.railway.app/"
              className="w-full h-full border-0 absolute inset-0"
              title="Chatbot Interface"
              allow="microphone; camera;"
            />
          </div>
        </div>
      )}

      {/* Floating Toggle Button - Anchored 200px from the bottom */}
      <div className={`fixed bottom-[200px] right-6 z-[9999] group ${isOpen ? "hidden sm:flex" : "flex"} flex-col items-end`} dir="rtl">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-110 overflow-hidden ring-4 ring-primary/20 ${!isOpen ? "animate-bounce hover:animate-none group-hover:animate-none" : ""}`}
        >
          {isOpen ? (
            <div className="w-full h-full bg-primary flex items-center justify-center text-white">
              <X className="w-8 h-8" />
            </div>
          ) : (
            <>
              <Image 
                src="/chatbot-logo.png" 
                alt="Chatbot Helper" 
                width={64} 
                height={64} 
                className="object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('bg-primary', 'show-fallback');
                  e.currentTarget.parentElement?.classList.remove('bg-white');
                }}
              />
              <MessageCircle className="absolute inset-0 m-auto w-8 h-8 text-white hidden [.show-fallback_&]:block" />
            </>
          )}
        </button>
        
        {/* Tooltip (Only show if not open) */}
        {!isOpen && (
          <div className="absolute bottom-4 right-[calc(100%+1rem)] opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-lg shadow-xl text-sm text-gray-700 font-medium whitespace-nowrap pointer-events-none border border-gray-100">
            المساعد الذكي (Chatbot)
            {/* Triangle arrow */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-4 h-4 bg-white transform rotate-45 border-t border-r border-gray-100"></div>
          </div>
        )}
      </div>
    </>
  );
}
