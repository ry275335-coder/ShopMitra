// ==============================================================================
// src/components/customer/VoiceSearchModal.tsx
// Interactive Bilingual (Hindi / English) Speech-to-Search Voice Modal
// ==============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Languages,
  Sparkles,
  Search,
  Volume2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Radio
} from 'lucide-react';
import {
  SupportedLanguage,
  isSpeechRecognitionSupported,
  normalizeVoiceQuery,
  VOICE_SUGGESTIONS
} from '@/lib/speech';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (normalizedQuery: string) => void;
}

export function VoiceSearchModal({
  isOpen,
  onClose,
  onSearch,
}: VoiceSearchModalProps) {
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('hi-IN');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Clean up recognition instance when closing
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setErrorMessage(null);
    } else {
      // Auto-start listening on modal open if supported
      if (isSpeechRecognitionSupported()) {
        startListening();
      }
    }
    return () => {
      stopListening();
    };
  }, [isOpen, selectedLang]);

  const startListening = () => {
    if (typeof window === 'undefined') return;
    setErrorMessage(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setErrorMessage('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = selectedLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setTranscript(final);
          setInterimTranscript('');
          setIsListening(false);
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permission in your browser.');
        } else if (event.error === 'no-speech') {
          setErrorMessage('No speech detected. Please speak clearly into your microphone.');
        } else {
          setErrorMessage(`Recognition error: ${event.error}. You can use sample voice prompts below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      setIsListening(false);
      setErrorMessage(err.message || 'Could not access microphone.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const activeText = transcript || interimTranscript;
  const normalizedPreview = activeText ? normalizeVoiceQuery(activeText, selectedLang) : '';

  const handleExecuteSearch = (queryToSearch: string) => {
    stopListening();
    const finalQuery = normalizeVoiceQuery(queryToSearch, selectedLang);
    onSearch(finalQuery);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>ShopMitra Voice Search</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  Live
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speak naturally in Hindi or English to discover store prices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex flex-col items-center text-center">
          {/* Language Switcher Pill */}
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
            <button
              onClick={() => {
                setSelectedLang('hi-IN');
                setTranscript('');
                setInterimTranscript('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLang === 'hi-IN'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇮🇳</span>
              <span>हिन्दी (Hindi)</span>
            </button>

            <button
              onClick={() => {
                setSelectedLang('en-IN');
                setTranscript('');
                setInterimTranscript('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLang === 'en-IN'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span>English (India)</span>
            </button>
          </div>

          {/* Central Pulsing Microphone Disc */}
          <div className="relative my-3 flex items-center justify-center">
            {/* Multi-tier animated pulse rings */}
            {isListening && (
              <>
                <div className="absolute w-36 h-36 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full bg-emerald-500/30 animate-pulse" />
              </>
            )}

            <button
              onClick={toggleListening}
              className={`relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white transition-all shadow-xl ${
                isListening
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 ring-4 ring-emerald-300 dark:ring-emerald-800 shadow-emerald-600/40 scale-105'
                  : 'bg-gradient-to-tr from-slate-700 to-slate-800 hover:from-emerald-600 hover:to-emerald-500 shadow-slate-700/30'
              }`}
            >
              {isListening ? (
                <Mic className="w-9 h-9 sm:w-11 sm:h-11 animate-pulse" />
              ) : (
                <MicOff className="w-9 h-9 sm:w-11 sm:h-11 text-slate-300" />
              )}
            </button>
          </div>

          {/* Listening Status Label */}
          <div className="mt-4 flex items-center gap-1.5 text-xs font-bold">
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  {selectedLang === 'hi-IN' ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now'}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  {transcript ? 'Tap mic to speak again' : 'Tap the microphone to speak'}
                </span>
              </>
            )}
          </div>

          {/* Live Transcript Display Box */}
          <div className="w-full mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-h-[90px] flex flex-col justify-center text-left">
            {activeText ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Recognized Speech:
                </div>
                <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  "{activeText}"
                </div>
                {normalizedPreview && normalizedPreview !== activeText && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Catalog Match: <strong className="font-extrabold text-slate-900 dark:text-slate-100">{normalizedPreview}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 dark:text-slate-500 italic py-2">
                {selectedLang === 'hi-IN'
                  ? '"सैमसंग चार्जर", "आशीर्वाद आटा 5kg", "लॉजिटेक माउस"...'
                  : '"Samsung 25W charger under 1200", "Crucial SSD within 3km"...'}
              </div>
            )}
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="w-full mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Search Trigger CTA if text recognized */}
          {activeText && (
            <button
              onClick={() => handleExecuteSearch(activeText)}
              className="w-full mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Search Counter Rates for "{normalizedPreview || activeText}"</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Quick Vernacular Speech Simulation Chips */}
          <div className="w-full mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                <span>Or Tap a Voice Sample to Test:</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">1-Click Test</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {VOICE_SUGGESTIONS[selectedLang].map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => {
                    setTranscript(sample.label);
                    handleExecuteSearch(sample.query);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-left"
                >
                  <span className="text-[10px] text-slate-400">🎙️</span>
                  <span>{sample.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
