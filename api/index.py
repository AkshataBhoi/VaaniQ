# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
import re
import os
import nltk
from nltk import word_tokenize, pos_tag
from nltk.stem import WordNetLemmatizer
from nltk.corpus import wordnet

# Download NLTK data if not present (runs once at startup)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')
try:
    nltk.data.find('corpora/omw-1.4')
except LookupError:
    nltk.download('omw-1.4')
lemmatizer = WordNetLemmatizer()

app = Flask(__name__)

# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text):
    if not text or not text.strip():
        return {
            'code': 'unknown',
            'name': 'Unknown',
            'confidence': 0
        }
    # Gujarati Unicode block
    if re.search(r'[\u0A80-\u0AFF]', text):
        return {
            'code': 'gu',
            'name': 'Gujarati',
            'confidence': 0.96
        }
    # Devanagari Unicode block
    if re.search(r'[\u0900-\u097F]', text):
        marathi_keywords = [
            'मला', 'आहे', 'उद्या', 'जायचे',
            'मी', 'तुला', 'माझे', 'माझा',
            'माझी', 'कुठे', 'काय', 'आहेत',
            'जातो', 'जाते', 'करतो', 'करते',
            'मुंबईला', 'पुण्याला'
        ]
        hindi_keywords = [
            'मुझे', 'है', 'कल', 'जाना',
            'मैं', 'तुम', 'वह', 'यह',
            'मेरा', 'मेरी', 'मेरे',
            'कहाँ', 'क्या', 'हैं',
            'जाता', 'जाती', 'करता',
            'करती', 'मुंबई'
        ]
        m_score = sum(1 for keyword in marathi_keywords if keyword in text)
        h_score = sum(1 for keyword in hindi_keywords if keyword in text)
        if m_score > h_score:
            confidence = min(0.95, 0.70 + ((m_score - h_score) * 0.08))
            return {
                'code': 'mr',
                'name': 'Marathi',
                'confidence': round(confidence, 2)
            }
        if h_score > m_score:
            confidence = min(0.95, 0.70 + ((h_score - m_score) * 0.08))
            return {
                'code': 'hi',
                'name': 'Hindi',
                'confidence': round(confidence, 2)
            }
        return {
            'code': 'hi',
            'name': 'Hindi/Marathi',
            'confidence': 0.50
        }
    # Basic English detection
    if re.match(r'^[a-zA-Z0-9\s.,!?\'\"()\-]+$', text):
        return {
            'code': 'en',
            'name': 'English',
            'confidence': 0.98
        }
    return {
        'code': 'unknown',
        'name': 'Unknown',
        'confidence': 0
    }

# ============================================================
# NLTK NLP PIPELINE (English only)
# ============================================================

# Mapping from Penn Treebank tags to universal POS tags
PTB_TO_UNIVERSAL = {
    'CC': 'CCONJ',
    'CD': 'NUM',
    'DT': 'DET',
    'EX': 'PRON',
    'FW': 'X',
    'IN': 'ADP',
    'JJ': 'ADJ',
    'JJR': 'ADJ',
    'JJS': 'ADJ',
    'LS': 'X',
    'MD': 'AUX',
    'NN': 'NOUN',
    'NNS': 'NOUN',
    'NNP': 'PROPN',
    'NNPS': 'PROPN',
    'PDT': 'DET',
    'POS': 'PART',
    'PRP': 'PRON',
    'PRP$': 'PRON',
    'RB': 'ADV',
    'RBR': 'ADV',
    'RBS': 'ADV',
    'RP': 'PART',
    'SYM': 'X',
    'TO': 'PART',
    'UH': 'X',
    'VB': 'VERB',
    'VBD': 'VERB',
    'VBG': 'VERB',
    'VBN': 'VERB',
    'VBP': 'VERB',
    'VBZ': 'VERB',
    'WDT': 'DET',
    'WP': 'PRON',
    'WP$': 'PRON',
    'WRB': 'ADV',
    # Anything else falls back to 'X'
}

def map_ptb_to_universal(tag):
    return PTB_TO_UNIVERSAL.get(tag, 'X')

def nltk_pos_to_wordnet(tag):
    """Convert universal POS tag to WordNet POS tag for lemmatization."""
    if tag.startswith('N'):
        return wordnet.NOUN
    if tag.startswith('V'):
        return wordnet.VERB
    if tag.startswith('J'):
        return wordnet.ADJ
    if tag.startswith('R'):
        return wordnet.ADV
    return wordnet.NOUN

def analyze_with_nltk(text):
    """Tokenize, POS‑tag, map tags, and lemmatize using NLTK.

    Returns a list of token dictionaries matching the API contract.
    """
    # Tokenize using NLTK's word_tokenize (handles punctuation)
    tokens_raw = word_tokenize(text)
    # POS tag (Penn Treebank)
    pos_tags = pos_tag(tokens_raw)
    result = []
    for word, ptb_tag in pos_tags:
        universal = map_ptb_to_universal(ptb_tag)
        wn_tag = nltk_pos_to_wordnet(ptb_tag)
        try:
            lemma = lemmatizer.lemmatize(word, wn_tag)
        except Exception:
            lemma = word
        result.append({
            'text': word,
            'lemma': lemma,
            'pos': universal,
            'role': ''  # role mapping not needed for EN
        })
    return result

# ============================================================
# FALLBACK TOKENIZER
# ============================================================

def fallback_tokenize(text):
    """
    Used only if Stanza cannot be loaded.

    Supports:
    - English
    - Devanagari
    - Gujarati
    - punctuation
    - numbers
    """
    pattern = (
        r'[\w\u0900-\u097F\u0A80-\u0AFF]+'
        r'|[^\s\w\u0900-\u097F\u0A80-\u0AFF]+'
    )
    matches = re.findall(pattern, text)
    return [token.strip() for token in matches if token.strip()]

# ============================================================
# FALLBACK LEMMATIZER
# ============================================================

def fallback_lemmatize(token, lang_code):
    dictionaries = {
        'mr': {
            'मला': 'मी',
            'जायचे': 'जा',
            'आहे': 'असणे',
            'गेलो': 'जा',
            'गेली': 'जा',
            'मुंबईला': 'मुंबई',
            'करतो': 'कर',
            'करते': 'कर',
        },
        'hi': {
            'मुझे': 'मैं',
            'जाना': 'जा',
            'गया': 'जा',
            'गई': 'जा',
            'करता': 'कर',
            'करती': 'कर',
            'है': 'होना',
        },
        'en': {
            'running': 'run',
            'ran': 'run',
            'runs': 'run',
            'goes': 'go',
            'went': 'go',
            'going': 'go',
            'is': 'be',
            'are': 'be',
            'was': 'be',
            'were': 'be',
        },
        'gu': {}
    }
    return dictionaries.get(lang_code, {}).get(token.lower(), token)

# ============================================================
# FALLBACK POS TAGGER
# ============================================================

def fallback_pos_tag(token, lang_code):
    t = token.lower()
    dictionaries = {
        'mr': {
            'मला': 'PRON',
            'मी': 'PRON',
            'तुला': 'PRON',
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
            'गया': 'VERB',
            'है': 'AUX',
        },
        'en': {
            'i': 'PRON',
            'me': 'PRON',
            'tomorrow': 'ADV',
            'go': 'VERB',
            'going': 'VERB',
            'running': 'VERB',
            'is': 'AUX',
            'are': 'AUX',
            'was': 'AUX',
        }
    }
    tag = dictionaries.get(lang_code, {}).get(t)
    if tag:
        return tag
    if re.match(r'^[A-Z][a-z]+$', token):
        return 'PROPN'
    if re.match(r'^[0-9]+$', token):
        return 'NUM'
    if re.match(r'^[^\w\s\u0900-\u097F\u0A80-\u0AFF]+$', token):
        return 'PUNCT'
    if lang_code == 'en':
        if t.endswith('ly'):
            return 'ADV'
        if t.endswith('ing') or t.endswith('ed'):
            return 'VERB'
        if t.endswith('ion') or t.endswith('ity') or t.endswith('ment'):
            return 'NOUN'
        if t.endswith('ous') or t.endswith('ful') or t.endswith('able'):
            return 'ADJ'
    return 'NOUN'

# ============================================================
# ROLE MAPPING
# ============================================================

def map_dependency_role(deprel, pos):
    """
    Convert Universal Dependencies relations into
    simple UI-friendly grammatical roles.
    """
    role_map = {
        'nsubj': 'Subject',
        'csubj': 'Subject',
        'obj': 'Object',
        'iobj': 'Indirect Object',
        'obl': 'Modifier / Oblique',
        'advmod': 'Time / Manner',
        'amod': 'Attribute / Modifier',
        'aux': 'Auxiliary',
        'root': 'Main Action',
        'cop': 'Copula',
        'case': 'Case Marker',
        'det': 'Determiner',
        'conj': 'Conjunction',
        'cc': 'Conjunction',
        'nmod': 'Noun Modifier',
        'compound': 'Compound',
        'mark': 'Marker',
        'punct': 'Punctuation',
    }
    if deprel in role_map:
        return role_map[deprel]
    # Safe fallback based on POS
    fallback_roles = {
        'PRON': 'Pronoun',
        'VERB': 'Action',
        'AUX': 'Auxiliary',
        'ADV': 'Qualifier',
        'ADJ': 'Modifier',
        'PROPN': 'Entity',
        'NOUN': 'Noun',
        'NUM': 'Number',
        'PUNCT': 'Punctuation'
    }
    return fallback_roles.get(pos, 'Nominal')

# ============================================================
# FALLBACK ANALYSIS
# ============================================================

def analyze_with_fallback(text, lang_code):
    raw_tokens = fallback_tokenize(text)
    tokens = []
    for token in raw_tokens:
        lemma = fallback_lemmatize(token, lang_code)
        pos = fallback_pos_tag(token, lang_code)
        role = map_dependency_role('', pos)
        tokens.append({
            'text': token,
            'lemma': lemma,
            'pos': pos,
            'role': role
        })
    return tokens

# ============================================================
# MAIN API
# KEEP THIS ROUTE EXACTLY THE SAME
# ============================================================

@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        text = data['text']
        if not isinstance(text, str):
            return jsonify({'error': 'Text must be a string'}), 400
        text = text.strip()
        if not text:
            return jsonify({'error': 'Text cannot be empty'}), 400
        # 1. Language Detection
        language = detect_language(text)
        # 2. NLP Analysis (English via NLTK, others fallback)
        if language['code'] == 'en':
            tokens = analyze_with_nltk(text)
        else:
            tokens = analyze_with_fallback(text, language['code'])
        # 3. Safe fallback (in case analysis failed)
        if tokens is None:
            tokens = analyze_with_fallback(text, language['code'])
        # 4. Response
        return jsonify({'language': language, 'tokens': tokens})
    except Exception as error:
        print(f"Analysis API error: {error}")
        return jsonify({'error': 'NLP analysis failed', 'message': str(error)}), 500

# ============================================================
# SERVER
# ============================================================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)