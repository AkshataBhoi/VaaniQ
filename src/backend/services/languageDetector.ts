export function detectLanguage(text: string) {
  if (!text) return { code: 'unknown', name: 'Unknown', confidence: 0 };

  const devanagariRegex = /[\u0900-\u097F]/;
  if (devanagariRegex.test(text)) {
    // Distinguish between Marathi and Hindi
    const marathiKeywords = ['मला', 'आहे', 'उद्या', 'जायचे', 'मी', 'तुला', 'तो', 'ती', 'ते'];
    const hindiKeywords = ['मुझे', 'है', 'कल', 'जाना', 'मैं', 'तुम', 'वह', 'यह'];
    
    let marathiScore = 0;
    let hindiScore = 0;
    
    marathiKeywords.forEach(kw => { if (text.includes(kw)) marathiScore++; });
    hindiKeywords.forEach(kw => { if (text.includes(kw)) hindiScore++; });

    if (marathiScore > hindiScore) {
      return { code: 'mr', name: 'Marathi', confidence: 0.95 };
    } else if (hindiScore > marathiScore) {
      return { code: 'hi', name: 'Hindi', confidence: 0.95 };
    } else {
      return { code: 'hi', name: 'Hindi/Marathi', confidence: 0.5 }; // Low confidence
    }
  }

  const gujaratiRegex = /[\u0A80-\u0AFF]/;
  if (gujaratiRegex.test(text)) {
    return { code: 'gu', name: 'Gujarati', confidence: 0.96 };
  }

  const englishRegex = /^[a-zA-Z0-9\s.,!?'"-]+$/;
  if (englishRegex.test(text)) {
    return { code: 'en', name: 'English', confidence: 0.98 };
  }

  return { code: 'unknown', name: 'Unknown', confidence: 0 };
}
