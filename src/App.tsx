import { useState, useEffect, useRef } from 'react'

type AppState = 'idle' | 'listening' | 'processing' | 'speaking' | 'complete' | 'error'

interface NLPToken {
  text: string
  lemma: string
  pos: string
  role: string
}

interface NLPAnalysis {
  language: { code: string; name: string; confidence: number }
  tokens: NLPToken[]
}

interface HistoryItem {
  id: string
  timestamp: string
  inputText: string
  detectedLanguage: string
  tokens: NLPToken[]
}

const LANGUAGES = [
  'English', 'Hindi', 'Marathi', 'Gujarati'
]

const POS_COLORS: Record<string, string> = {
  PRON: 'from-violet-500/20 to-purple-500/20 border-violet-400/40 text-violet-300',
  VERB: 'from-amber-500/20 to-orange-500/20 border-amber-400/40 text-amber-300',
  NOUN: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-300',
  PROPN: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/40 text-emerald-300',
  AUX: 'from-rose-500/20 to-pink-500/20 border-rose-400/40 text-rose-300',
  ADV: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/40 text-cyan-300',
  ADJ: 'from-blue-500/20 to-indigo-500/20 border-blue-400/40 text-blue-300',
}

function AiVoiceOrb({ state }: { state: AppState }) {
  const isInteracting = state === 'listening' || state === 'speaking'

  return (
    <div className="relative flex items-center justify-center w-full h-36 my-2 overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border border-zinc-800/80 shadow-inner">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute rounded-full transition-all duration-700 ${
            isInteracting
              ? 'w-28 h-28 bg-indigo-500/30 blur-xl animate-ping'
              : 'w-20 h-20 bg-indigo-500/10 blur-md'
          }`}
        />
        <div
          className={`absolute rounded-full transition-all duration-500 ${
            isInteracting
              ? 'w-24 h-24 bg-purple-500/40 blur-lg animate-pulse'
              : 'w-16 h-16 bg-purple-500/10 blur-sm'
          }`}
        />
        <div
          className={`relative rounded-full bg-gradient-to-tr transition-all duration-500 shadow-2xl flex items-center justify-center ${
            state === 'listening'
              ? 'w-20 h-20 from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/50 scale-110'
              : state === 'speaking'
              ? 'w-20 h-20 from-cyan-400 via-indigo-500 to-purple-600 shadow-cyan-500/50 scale-110 animate-pulse'
              : state === 'processing'
              ? 'w-16 h-16 from-amber-400 to-orange-500 shadow-amber-500/30 rotate-180 animate-spin'
              : state === 'error'
              ? 'w-16 h-16 from-red-600 via-rose-500 to-red-800 shadow-red-500/30'
              : 'w-16 h-16 from-indigo-600/80 via-purple-600/80 to-zinc-800 shadow-indigo-500/20'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 animate-pulse" />
        </div>
      </div>
      {isInteracting && (
        <div className="absolute flex items-center gap-1 z-10">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-indigo-300/60 animate-pulse"
              style={{
                height: `${Math.max(6, Math.sin(i * 0.5) * 32 + 16)}px`,
                animationDelay: `${(i * 80) % 800}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MicIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function SpeakerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [inputText, setInputText] = useState('')
  const [analysis, setAnalysis] = useState<NLPAnalysis | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('vaaniq_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch (e) {}
    }
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  function saveHistory(newHistory: HistoryItem[]) {
    setHistory(newHistory)
    localStorage.setItem('vaaniq_history', JSON.stringify(newHistory))
  }

  function handleMicClick() {
    if (appState === 'listening') {
      recognitionRef.current?.stop()
      setAppState('idle')
      return
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMessage('Speech recognition is not supported in this browser.')
      setAppState('error')
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = true
    
    recognition.onstart = () => {
      setAppState('listening')
      setErrorMessage('')
    }
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('')
      setInputText(transcript)
    }
    
    recognition.onerror = (event: any) => {
      setErrorMessage(`Error: ${event.error}`)
      setAppState('error')
    }
    
    recognition.onend = () => {
      setAppState('idle')
    }
    
    recognitionRef.current = recognition
    recognition.start()
  }

  function handleSpeakClick() {
    if (!synthRef.current) {
      setErrorMessage('Speech synthesis is not supported in this browser.')
      return
    }

    if (appState === 'speaking') {
      synthRef.current.cancel()
      setAppState('idle')
      return
    }

    if (!inputText.trim()) return

    const utterance = new SpeechSynthesisUtterance(inputText)
    utterance.onstart = () => setAppState('speaking')
    utterance.onend = () => setAppState('idle')
    utterance.onerror = () => setAppState('idle')
    
    synthRef.current.speak(utterance)
  }

  async function handleAnalyze() {
    if (!inputText.trim()) return
    
    setAppState('processing')
    setErrorMessage('')
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze')
      
      setAnalysis(data)
      setAppState('complete')
      
      const newEntry: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        inputText: inputText,
        detectedLanguage: data.language.name,
        tokens: data.tokens
      }
      saveHistory([newEntry, ...history])
    } catch (e: any) {
      setErrorMessage(e.message)
      setAppState('error')
    }
  }

  function clearText() {
    setInputText('')
    setAnalysis(null)
    setAppState('idle')
    setErrorMessage('')
    synthRef.current?.cancel()
    recognitionRef.current?.stop()
  }

  function loadHistoryItem(item: HistoryItem) {
    setInputText(item.inputText)
    setAnalysis({
      language: { code: 'unknown', name: item.detectedLanguage, confidence: 1 },
      tokens: item.tokens
    })
    setAppState('complete')
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden antialiased">
      
      {/* BACKGROUND TEXTURE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370d_1px,transparent_1px),linear-gradient(to_bottom,#1f29370d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-cyan-500/10 blur-[150px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0c10]/60 border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/30">
              <div className="w-full h-full bg-zinc-950/90 rounded-[11px] flex items-center justify-center">
                <MicIcon className="w-4 h-4 text-indigo-300" />
              </div>
            </div>
            <div>
              <span className="font-bold tracking-tight text-lg bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                VaaniQ
              </span>
              <span className="ml-2 text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                NLP Workstation
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-300 bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200"
          >
            {showHistory ? 'Hide History' : 'History'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 pb-24 relative z-10 space-y-8">
        
        <div className="text-center mb-10 mt-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 mb-4 tracking-tight">
            Real-time NLP Analysis Engine
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto font-light">
            Speak or type to instantly analyze syntactic and morphological structures in multiple Indian languages.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-900/40 border border-red-500/50 rounded-xl text-red-200 text-sm">
            {errorMessage}
          </div>
        )}

        {/* STT & TEXT AREA */}
        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          {/* LEFT: MIC PANEL */}
          <div className="bg-zinc-900/50 border border-zinc-700/60 rounded-3xl backdrop-blur-3xl shadow-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
            <AiVoiceOrb state={appState} />
            <div className="mt-6 flex flex-col items-center">
              <button
                onClick={handleMicClick}
                className={`relative group w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 active:scale-95 ${
                  appState === 'listening'
                    ? 'bg-rose-600 text-white shadow-2xl shadow-rose-600/50 ring-4 ring-rose-500/30 animate-pulse'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 ring-1 ring-white/20'
                }`}
              >
                <MicIcon className="w-8 h-8" />
              </button>
              <span className="mt-4 text-xs font-mono uppercase tracking-widest text-zinc-400">
                {appState === 'listening' ? 'Listening... Tap to Stop' : 'Tap to Speak'}
              </span>
            </div>
          </div>

          {/* RIGHT: TEXT PANEL */}
          <div className="bg-zinc-900/50 border border-zinc-700/60 rounded-3xl backdrop-blur-3xl shadow-2xl p-6 flex flex-col">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  if (analysis) setAnalysis(null)
                }}
                placeholder="Or type text here..."
                className="w-full h-full min-h-[200px] bg-transparent text-2xl font-medium text-white placeholder-zinc-600 focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/80">
              <div className="flex gap-3">
                <button
                  onClick={clearText}
                  className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-300 bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-white"
                >
                  Clear
                </button>
                <button
                  onClick={handleSpeakClick}
                  disabled={!inputText.trim() || appState === 'listening'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-300 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SpeakerIcon className="w-4 h-4" />
                  {appState === 'speaking' ? 'Stop TTS' : 'Speak this'}
                </button>
              </div>
              
              <button
                onClick={handleAnalyze}
                disabled={!inputText.trim() || appState === 'processing'}
                className="px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {appState === 'processing' ? 'Processing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>

        {/* NLP PIPELINE UI */}
        {analysis && (
          <div className="bg-zinc-900/50 border border-zinc-700/60 rounded-3xl p-6 backdrop-blur-3xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Pipeline Visualizer */}
            {/* <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-8 border-b border-zinc-800/80 overflow-x-auto gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> INPUT
              </div>
              <div className="hidden sm:block text-zinc-600">→</div>
              <div className="flex flex-col items-center">
                <div className="text-xs font-mono text-indigo-400 mb-1">LANGUAGE DETECTION</div>
                <div className="text-sm font-semibold text-zinc-200">{analysis.language.name}</div>
                <div className="text-[10px] text-zinc-500">{Math.round(analysis.language.confidence * 100)}% conf</div>
              </div>
              <div className="hidden sm:block text-zinc-600">→</div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div> TOKENIZATION
              </div>
              <div className="hidden sm:block text-zinc-600">→</div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div> LEMMATIZATION
              </div>
              <div className="hidden sm:block text-zinc-600">→</div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <div className="w-2 h-2 rounded-full bg-rose-500"></div> POS TAGGING
              </div>
            </div> */}

            <div className="flex items-center justify-between pb-4 mb-6">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Syntactic & Morphological Breakdown
              </h3>
              <span className="text-xs font-mono text-zinc-400">{analysis.tokens.length} Tokens Parsed</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {analysis.tokens.map((node, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-[200px] rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-cyan-400/20 p-[1px] shadow-lg shadow-indigo-500/10"
                >
                  <div className="h-full w-full bg-zinc-950/90 rounded-[15px] p-4 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-400">Token #{i + 1}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-200 border border-zinc-700/50">
                        {node.pos}
                      </span>
                    </div>
                    
                    <div className="text-xl font-bold text-white my-1">{node.text}</div>
                    
                    <div className="space-y-1 mt-3 pt-3 border-t border-zinc-800/80 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Lemma:</span>
                        <span className="font-mono text-zinc-200">{node.lemma}</span>
                      </div>
                      {node.role && node.role !== 'Unknown' && (
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Role:</span>
                          <span className="font-mono text-indigo-300">{node.role}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY SECTION */}
        {showHistory && (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Analysis History</h3>
              <button onClick={() => saveHistory([])} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Clear All</button>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">No history yet.</div>
            ) : (
              <div className="grid gap-3">
                {history.map(item => (
                  <div 
                    key={item.id}
                    className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 cursor-pointer flex justify-between items-center transition-all"
                  >
                    <div className="flex-1 min-w-0 pr-4" onClick={() => loadHistoryItem(item)}>
                      <div className="text-zinc-200 font-medium truncate">{item.inputText}</div>
                      <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                        <span className="text-indigo-400">{item.detectedLanguage}</span>
                        <span>•</span>
                        <span>{item.tokens.length} tokens</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        saveHistory(history.filter(h => h.id !== item.id))
                      }}
                      className="p-2 text-zinc-600 hover:text-rose-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}