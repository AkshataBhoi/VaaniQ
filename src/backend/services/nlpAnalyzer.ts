import { detectLanguage } from './languageDetector.ts';
import { tokenize } from './tokenizer.ts';
import { lemmatize } from './lemmatizer.ts';
import { posTag, assignRole } from './posTagger.ts';

export function analyzeText(text: string) {
  const language = detectLanguage(text);
  const rawTokens = tokenize(text);
  
  const tokens = rawTokens.map(tokenStr => {
    const lemma = lemmatize(tokenStr, language.code);
    const pos = posTag(tokenStr, language.code);
    const role = assignRole(pos, tokenStr, language.code);
    
    return {
      text: tokenStr,
      lemma,
      pos,
      role
    };
  });

  return {
    language,
    tokens
  };
}
