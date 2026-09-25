export function tokenize(text: string) {
  // Replace punctuation with space padded punctuation to tokenize them properly if needed,
  // or just use regex to extract words and punctuation.
  const regex = /[\w\u0900-\u097F]+|[^\s\w\u0900-\u097F]+/g;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.trim()).filter(m => m.length > 0) : [];
}
