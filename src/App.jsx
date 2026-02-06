import React, { useState, useEffect, useRef } from "react";
import { analyzeIncident } from "./logic";

export default function App() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  async function handleAsk() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message with a slight delay for smooth transition
    setMessages(prev => [...prev, { type: "user", text: userMessage }]);

    setBusy(true);
    try {
      const analysis = await analyzeIncident(userMessage);

      // Add AI response
      setMessages(prev => [...prev, {
        type: "assistant",
        text: analysis.message || analysis.response?.onGround,
        isGeneralQuery: analysis.isGeneralQuery
      }]);
    } catch (e) {
      // Display user-friendly error messages
      let errorMessage = "Something went wrong. Please try again.";
      
      if (e.message) {
        // Use the error message if it's already user-friendly
        if (e.message.includes("having trouble processing") ||
            e.message.includes("Rate limit") ||
            e.message.includes("Missing VITE_GEMINI_API_KEY") ||
            e.message.includes("encountered an issue")) {
          errorMessage = e.message;
        } else if (e.message.includes("JSON") || e.message.includes("parse")) {
          errorMessage = "I'm having trouble processing the response. Please try rephrasing your question or try again in a moment.";
        } else if (e.message.includes("fetch") || e.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      setMessages(prev => [...prev, {
        type: "error",
        text: errorMessage
      }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Kala Pola Incident Assistant
          </h1>
          <p className="text-sm text-gray-600 mt-1">AI-powered incident analysis</p>
        </div>
      </div>

      {/* Chat Container */}
      <div ref={chatContainerRef} className="max-w-4xl mx-auto px-6 py-8 pb-32 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center transform transition-transform hover:scale-110 duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome! How can I help?
            </h2>
            <p className="text-gray-600">Describe an incident and I'll analyze it for you.</p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className="animate-slide-in">
              {msg.type === "user" && (
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-xl shadow-md transform transition-all duration-200 hover:scale-[1.02]">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )}

              {msg.type === "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 max-w-xl shadow-md border border-gray-100 transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
                    <p className="text-gray-800 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              )}

              {msg.type === "error" && (
                <div className="flex justify-start">
                  <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-5 py-3 max-w-xl transform transition-all duration-200 hover:scale-[1.02]">
                    <p className="text-red-700 text-sm">⚠️ {msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div className="flex justify-start animate-slide-in">
              <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-md border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">Analyzing...</span>
                </div>
              </div>
            </div>
          )}

          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Describe the incident..."
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
            />
            <button
              onClick={handleAsk}
              disabled={busy || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          
          <p className="text-[12px] text-gray-400 mt-1 text-center font-medium">
            Developed by HTTech@hardtalk(pvt)LTD
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}