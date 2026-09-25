export function posTag(token: string, langCode: string) {
  // Simple heuristic based POS tagger fallback
  const dictionary: Record<string, Record<string, string>> = {
    'mr': {
      'मला': 'PRON',
      'मी': 'PRON',
      'उद्या': 'ADV',
      'मुंबईला': 'PROPN',
      'मुंबई': 'PROPN',
      'जायचे': 'VERB',
      'जा': 'VERB',
      'आहे': 'AUX',
      'असणे': 'AUX',
    },
    'hi': {
      'मुझे': 'PRON',
      'मैं': 'PRON',
      'कल': 'ADV',
      'जाना': 'VERB',
      'है': 'AUX',
    },
    'en': {
      'i': 'PRON',
      'me': 'PRON',
      'tomorrow': 'ADV',
      'go': 'VERB',
      'running': 'VERB',
      'is': 'AUX',
      'are': 'AUX',
    }
  };

  const langDict = dictionary[langCode] || {};
  const tag = langDict[token.toLowerCase()];
  if (tag) return tag;

  // Real-time morphological and heuristic fallbacks
  const t = token.toLowerCase();
  
  if (/^[A-Z][a-z]+$/.test(token)) return 'PROPN'; 
  if (/^[0-9]+$/.test(token)) return 'NUM';
  if (/^[^\w\s\u0900-\u097F\u0A80-\u0AFF]+$/.test(token)) return 'PUNCT';
  
  // English heuristics
  if (langCode === 'en') {
    if (t.endsWith('ly')) return 'ADV';
    if (t.endsWith('ing') || t.endsWith('ed')) return 'VERB';
    if (t.endsWith('ion') || t.endsWith('ity') || t.endsWith('ment')) return 'NOUN';
    if (t.endsWith('ous') || t.endsWith('ful') || t.endsWith('able')) return 'ADJ';
  }

  // Devanagari/Marathi/Hindi heuristics
  if (langCode === 'mr' || langCode === 'hi') {
    if (t.endsWith('ला') || t.endsWith('ने') || t.endsWith('शी')) return 'NOUN'; // Case markers
    if (t.endsWith('तो') || t.endsWith('ते') || t.endsWith('तात') || t.endsWith('चे')) return 'VERB'; // Verb endings
    if (t === 'आहे' || t === 'नाही' || t === 'होते' || t === 'है' || t === 'था') return 'AUX';
  }
  
  // Gujarati heuristics
  if (langCode === 'gu') {
    if (t.endsWith('છે') || t.endsWith('હતો') || t.endsWith('હતી')) return 'AUX';
    if (t.endsWith('કર') || t.endsWith('આવ') || t.endsWith('જ')) return 'VERB';
  }
  
  return 'NOUN'; // Default fallback
}

export function assignRole(pos: string, token: string, langCode: string) {
  // Dynamic semantic role assignment
  const t = token.toLowerCase();

  if (pos === 'PRON') return 'Subject/Actor';
  if (pos === 'ADV') return 'Time/Manner Qualifier';
  if (pos === 'PROPN') return 'Entity/Locative';
  if (pos === 'VERB') return 'Primary Action';
  if (pos === 'AUX') return 'Auxiliary/State';
  if (pos === 'ADJ') return 'Attribute/Modifier';
  
  if ((langCode === 'mr' || langCode === 'hi') && (t.endsWith('ला') || t.endsWith('को'))) {
    return 'Object/Recipient';
  }
  if (langCode === 'mr' && t.endsWith('त')) return 'Locative/In';
  if (langCode === 'en' && (t === 'in' || t === 'on' || t === 'at')) return 'Spatial/Temporal Relation';
  
  return 'Base Nominal'; 
}
