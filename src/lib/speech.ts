// ==============================================================================
// src/lib/speech.ts
// Web Speech Recognition API Wrapper with Vernacular Hindi & English Mapping
// ==============================================================================

export type SupportedLanguage = 'hi-IN' | 'en-IN';

export interface SpeechRecognitionResultState {
  transcript: string;
  interimTranscript: string;
  isFinal: boolean;
  confidence: number;
}

// Vernacular Hindi vocabulary mapping to catalog search keywords
const HINDI_CATALOG_DICTIONARY: Record<string, string> = {
  // Electronics & Peripherals
  'चार्जर': 'Charger',
  'फास्ट चार्जर': 'Fast Charger',
  'सैमसंग': 'Samsung',
  'माउस': 'Mouse',
  'वायरलेस माउस': 'Wireless Mouse',
  'लॉजिटेक': 'Logitech',
  'एसएसडी': 'SSD',
  'मेमोरी': 'Storage',
  'क्रूशियल': 'Crucial',
  'केबल': 'Cable',
  'हेडफोन': 'Headphones',
  'इयरफोन': 'Earphones',

  // Groceries & Staples
  'आटा': 'Atta',
  'आशीर्वाद': 'Aashirvaad',
  'गेहूं': 'Wheat',
  'मक्खन': 'Butter',
  'बटर': 'Butter',
  'अमूल': 'Amul',
  'दूध': 'Milk',
  'चावल': 'Rice',
  'बासमती': 'Basmati',
  'तेल': 'Oil',
  'दाल': 'Dal',

  // Hardware & Security
  'ताला': 'Lock Padlock',
  'गोदरेज': 'Godrej',
  'चाबी': 'Keys',
  'हार्डवेयर': 'Hardware',
};

// Hindi intent modifiers (price and distance constraints)
const HINDI_INTENT_PATTERNS = [
  { regex: /(?:कम से कम दाम|सस्ता|सस्ते दाम में|कम कीमत)/i, replacement: 'lowest price' },
  { regex: /(?:के अंदर|से कम|तक)\s*(\d+)/i, replacement: 'under $1' },
  { regex: /(\d+)\s*(?:के अंदर|से कम|तक)/i, replacement: 'under $1' },
  { regex: /(\d+)\s*(?:रुपये|रुपए|रूपए|रु)/i, replacement: 'under $1' },
  { regex: /(?:पास में|नजदीक|आस पास|आसपास)/i, replacement: 'within 3km' },
  { regex: /(\d+)\s*(?:किलोमीटर|किमी)/i, replacement: 'within $1km' },
];

/**
 * Check if the current browser environment supports the SpeechRecognition API
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Normalizes Hindi or vernacular conversational query into product catalog search terms
 */
export function normalizeVoiceQuery(rawQuery: string, lang: SupportedLanguage): string {
  let query = rawQuery.trim();
  if (!query) return '';

  if (lang === 'hi-IN') {
    // 1. Transform intent patterns (e.g. "500 रुपये से कम" -> "under 500")
    for (const pattern of HINDI_INTENT_PATTERNS) {
      query = query.replace(pattern.regex, ` ${pattern.replacement} `);
    }

    // 2. Map Hindi product nouns to English catalog counterparts
    for (const [hindiWord, englishTerm] of Object.entries(HINDI_CATALOG_DICTIONARY)) {
      const reg = new RegExp(hindiWord, 'gi');
      query = query.replace(reg, ` ${englishTerm} `);
    }
  }

  // Clean extra spaces & punctuation
  return query.replace(/[।?!,.]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Preset bilingual conversational sample prompts for instant simulation & testing
 */
export const VOICE_SUGGESTIONS: Record<SupportedLanguage, { label: string; query: string }[]> = {
  'hi-IN': [
    { label: 'कम दाम में सैमसंग चार्जर', query: 'Samsung 25W Fast Charger lowest price' },
    { label: 'आशीर्वाद आटा 5kg पास में', query: 'Aashirvaad Atta 5kg within 3km' },
    { label: 'लॉजिटेक माउस 1000 के अंदर', query: 'Logitech Mouse under 1000' },
    { label: 'अमूल बटर 500g', query: 'Amul Butter 500g' },
    { label: 'क्रूशियल 1TB एसएसडी', query: 'Crucial 1TB SSD' },
    { label: 'गोदरेज 7 लीवर ताला', query: 'Godrej Nav-Tal Lock' },
  ],
  'en-IN': [
    { label: 'Samsung 25W charger under 1200', query: 'Samsung 25W charger under 1200' },
    { label: 'Crucial 1TB SSD within 3km', query: 'Crucial 1TB SSD within 3km' },
    { label: 'Logitech wireless mouse under 900', query: 'Logitech wireless mouse under 900' },
    { label: 'Aashirvaad Chakki Atta 5kg', query: 'Aashirvaad Chakki Atta 5kg' },
    { label: 'Amul Butter 500g lowest price', query: 'Amul Butter 500g lowest price' },
    { label: 'Godrej brass padlock', query: 'Godrej brass padlock' },
  ],
};
