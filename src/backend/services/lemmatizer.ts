export function lemmatize(token: string, langCode: string) {
  // A deterministic morphology/lexicon fallback as requested.
  const dictionary: Record<string, Record<string, string>> = {
    'mr': {
      'मला': 'मी',
      'जायचे': 'जा',
      'आहे': 'असणे',
      'गेलो': 'जा',
      'मुंबईला': 'मुंबई',
      'करतो': 'कर'
    },
    'hi': {
      'मुझे': 'मैं',
      'जाना': 'जा',
      'गया': 'जा',
      'करता': 'कर'
    },
    'en': {
      'running': 'run',
      'ran': 'run',
      'goes': 'go',
      'went': 'go',
      'is': 'be',
      'are': 'be'
    }
  };

  const langDict = dictionary[langCode] || {};
  return langDict[token.toLowerCase()] || token;
}
