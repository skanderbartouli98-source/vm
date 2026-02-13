import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GeminiTTSService } from './services/geminiService';
import { VoiceName, SpeechStyle, SpeechLanguage, SpeakerPersona, VocalGenre, GeneratedAudio, BGM_OPTIONS, DEFAULT_COLLECTIONS } from './types';
import { mixAudio } from './utils/audio';
import { 
  SpeakerWaveIcon, 
  ChatBubbleLeftRightIcon, 
  HistoryIcon, 
  MicrophoneIcon, 
  ArrowDownTrayIcon,
  PlayIcon,
  PauseIcon,
  SparklesIcon,
  BookOpenIcon,
  MusicalNoteIcon,
  TrashIcon,
  LanguageIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
  GlobeAltIcon,
  CloudArrowUpIcon,
  MusicalNoteIcon as SongIcon
} from './components/Icons';

// Localization Object
const translations = {
  ar: {
    title: "صوتي برو",
    subtitle: "بوابة الإبداع الصوتي العالمي",
    tab_single: "إلقاء",
    tab_song: "أغنية",
    tab_story: "قصة",
    tab_conv: "حوار",
    tab_history: "الأرشيف",
    generating: "جاري نحت الصوت...",
    settings_identity: "إعدادات الهوية",
    lang_dialect: "اللغة واللهجة",
    voice_timbre: "خامة الصوت",
    persona: "تقمص الشخصية",
    settings_performance: "ضبط الأداء",
    emotional_style: "النمط العاطفي",
    speed: "سرعة الإلقاء",
    pitch: "طبقة الصوت",
    pitch_deep: "عميق",
    pitch_normal: "عادي",
    pitch_high: "حاد",
    text_area_label: "النص المراد إلقاؤه",
    text_area_placeholder: "اكتب هنا النص بأي لغة تختارها...",
    tashkeel_btn: "تشكيل النص ذكياً",
    generate_btn: "إنتاج الصوت الآن",
    studio_offline: "الاستوديو غير نشط",
    studio_desc: "أنتج تحفة صوتية لبدء المعاينة",
    export_btn: "تصدير بنقاوة WAV",
    song_genre: "النمط الغنائي",
    song_tempo: "الإيقاع الزمني",
    song_placeholder: "اكتب كلمات أغنيتك هنا...",
    song_btn: "تلحين وتوليد الأداء الغنائي",
    bgm_label: "خلفية الأجواء",
    mix_vol: "توازن الصوت",
    story_placeholder: "اكتب فصول قصتك...",
    story_btn: "إنتاج الفيلم الصوتي",
    conv_s1: "طرف الحوار الأول",
    conv_s2: "طرف الحوار الثاني",
    conv_script: "السيناريو المقترح",
    conv_btn: "توليد المحادثة الثنائية",
    history_empty: "لا يوجد سجل مسجل"
  },
  en: {
    title: "Sawtify Pro",
    subtitle: "Global Audio Creativity Hub",
    tab_single: "Voiceover",
    tab_song: "Song",
    tab_story: "Story",
    tab_conv: "Dialogue",
    tab_history: "Archive",
    generating: "Sculpting Audio...",
    settings_identity: "Identity Settings",
    lang_dialect: "Language & Dialect",
    voice_timbre: "Voice Timbre",
    persona: "Speaker Persona",
    settings_performance: "Performance Controls",
    emotional_style: "Emotional Style",
    speed: "Speed",
    pitch: "Voice Pitch",
    pitch_deep: "Deep",
    pitch_normal: "Normal",
    pitch_high: "High",
    text_area_label: "Script to Perform",
    text_area_placeholder: "Type your text in any language here...",
    tashkeel_btn: "Auto-Diacritics (AR)",
    generate_btn: "Produce Audio Now",
    studio_offline: "Studio Idle",
    studio_desc: "Generate an audio masterpiece to preview",
    export_btn: "Export High-Quality WAV",
    song_genre: "Vocal Genre",
    song_tempo: "Tempo",
    song_placeholder: "Write your lyrics here...",
    song_btn: "Compose & Generate Vocals",
    bgm_label: "Ambient Background",
    mix_vol: "Audio Balance",
    story_placeholder: "Write the chapters of your story...",
    story_btn: "Produce Audio Movie",
    conv_s1: "Speaker A",
    conv_s2: "Speaker B",
    conv_script: "Dialogue Script",
    conv_btn: "Generate Dual Dialogue",
    history_empty: "No recorded history yet"
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = translations[lang];
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'single' | 'conversation' | 'story' | 'song' | 'history'>('single');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Kore);
  const [style, setStyle] = useState<SpeechStyle>(SpeechStyle.Neutral);
  const [language, setLanguage] = useState<SpeechLanguage>(SpeechLanguage.Arabic_Fusha);
  const [persona, setPersona] = useState<SpeakerPersona>(SpeakerPersona.Default);
  const [speed, setSpeed] = useState(1);
  const [pitch, setPitch] = useState(1); // 0.5 to 1.5
  
  const [loading, setLoading] = useState(false);
  const [isTashkeeling, setIsTashkeeling] = useState(false);
  const [history, setHistory] = useState<GeneratedAudio[]>(() => {
    const saved = localStorage.getItem('sawtify_v4_history');
    return saved ? JSON.parse(saved).map((h: any) => ({...h, timestamp: new Date(h.timestamp)})) : [];
  });
  
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCollection, setSelectedCollection] = useState('all');
  
  const [vocalGenre, setVocalGenre] = useState<VocalGenre>(VocalGenre.Melodic);
  const [tempo, setTempo] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [selectedBgm, setSelectedBgm] = useState('none');
  const [customBgmUrl, setCustomBgmUrl] = useState<string | null>(null);
  const [bgmVolume, setBgmVolume] = useState(0.15);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsService = useRef(new GeminiTTSService());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [vData, setVData] = useState<number[]>(new Array(16).fill(0));

  useEffect(() => {
    localStorage.setItem('sawtify_v4_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setupVisualizer = () => {
    if (!audioRef.current || analyzerRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(audioRef.current);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 64;
      source.connect(analyzer);
      analyzer.connect(audioCtx.destination);
      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);

      const update = () => {
        if (analyzerRef.current && dataArrayRef.current) {
          analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
          const values = Array.from(dataArrayRef.current.slice(0, 16)).map((v: number) => v / 255);
          setVData(values);
        }
        requestAnimationFrame(update);
      };
      update();
    } catch (e) { console.warn(e); }
  };

  const handleTashkeel = async () => {
    if (!text.trim()) return;
    setIsTashkeeling(true);
    try {
      const result = await ttsService.current.addDiacritics(text);
      setText(result);
    } catch (e) { console.error(e); } finally { setIsTashkeeling(false); }
  };

  const handleGenerate = async (type: 'single' | 'story' | 'conversation' | 'song') => {
    if (!text.trim() && type !== 'conversation') return;
    setLoading(true);
    try {
      let result;
      if (type === 'conversation') {
        result = await ttsService.current.generateConversation({
          script, speaker1: { name: speaker1Name, voice: speaker1Voice }, speaker2: { name: speaker2Name, voice: speaker2Voice }
        });
      } else if (type === 'song') {
        result = await ttsService.current.generateSong({ text, voice, genre: vocalGenre, tempo });
      } else {
        result = await ttsService.current.generateSingleSpeaker({ 
          text, voice, speed, pitch, language, persona, style: type === 'story' ? SpeechStyle.Storyteller : style 
        });
      }

      let finalUrl = result.url;
      if ((type === 'story' || type === 'song') && selectedBgm !== 'none') {
        const bgmObj = BGM_OPTIONS.find(b => b.id === selectedBgm);
        const bgmSource = selectedBgm === 'custom' ? customBgmUrl : bgmObj?.url;
        if (bgmSource && bgmSource !== 'upload') {
          const mixedBlob = await mixAudio(result.audioBuffer, bgmSource, bgmVolume);
          finalUrl = URL.createObjectURL(mixedBlob);
        }
      }

      const newEntry: GeneratedAudio = {
        id: Date.now().toString(),
        text: (type === 'conversation' ? script : text).slice(0, 50),
        url: finalUrl,
        timestamp: new Date(),
        voice: type === 'conversation' ? (isAr ? 'حوار' : 'Dialogue') : (type === 'song' ? `${t.tab_song} (${vocalGenre})` : voice),
        type: type,
        collectionId: type === 'story' ? 'stories' : (type === 'song' ? 'songs' : 'work')
      };

      setHistory(prev => [newEntry, ...prev]);
      setCurrentAudio(newEntry);
      setIsPlaying(true);
    } catch (err) {
      alert(isAr ? "خطأ في التوليد." : "Generation Error.");
      console.error(err);
    } finally { setLoading(false); }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    setupVisualizer();
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  };

  // Conversation Local State
  const [speaker1Name, setSpeaker1Name] = useState('Speaker A');
  const [speaker1Voice, setSpeaker1Voice] = useState<VoiceName>(VoiceName.Charon);
  const [speaker2Name, setSpeaker2Name] = useState('Speaker B');
  const [speaker2Voice, setSpeaker2Voice] = useState<VoiceName>(VoiceName.Zephyr);
  const [script, setScript] = useState('A: Welcome to the future of voice.\nB: It sounds amazing!');

  const languagesByCategory = {
    Arabic: [
      SpeechLanguage.Arabic_Fusha, SpeechLanguage.Arabic_Egyptian, SpeechLanguage.Arabic_Gulf, 
      SpeechLanguage.Arabic_Levantine, SpeechLanguage.Arabic_Maghrebi, SpeechLanguage.Arabic_Sudanese,
      SpeechLanguage.Arabic_Iraqi
    ],
    English: [
      SpeechLanguage.English_US, SpeechLanguage.English_UK, SpeechLanguage.English_AU, SpeechLanguage.English_IN
    ],
    Global: [
      SpeechLanguage.French, SpeechLanguage.Spanish, SpeechLanguage.German, SpeechLanguage.Chinese,
      SpeechLanguage.Japanese, SpeechLanguage.Russian, SpeechLanguage.Turkish, SpeechLanguage.Italian,
      SpeechLanguage.Portuguese, SpeechLanguage.Korean
    ]
  };

  return (
    <div className={`min-h-screen bg-[#070b14] flex flex-col items-center p-4 md:p-8 text-slate-300 transition-all duration-500 ${isAr ? 'font-["Cairo"]' : 'font-sans'}`}>
      
      {/* Top Bar with Language Toggle */}
      <div className="w-full max-w-6xl flex justify-start mb-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-1 flex gap-1">
          <button onClick={() => setLang('ar')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isAr ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>عربي</button>
          <button onClick={() => setLang('en')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!isAr ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>English</button>
        </div>
      </div>

      {/* Header */}
      <header className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="bg-indigo-600 p-4 rounded-[1.5rem] shadow-2xl group-hover:rotate-12 transition-transform">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{t.title} <span className="text-indigo-500 text-sm font-medium">V4.0</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{t.subtitle}</p>
          </div>
        </div>

        <nav className="flex bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-[1.8rem] border border-slate-800/50">
          {[
            { id: 'single', label: t.tab_single, icon: <MicrophoneIcon className="w-4 h-4" /> },
            { id: 'song', label: t.tab_song, icon: <SongIcon className="w-4 h-4" /> },
            { id: 'story', label: t.tab_story, icon: <BookOpenIcon className="w-4 h-4" /> },
            { id: 'conversation', label: t.tab_conv, icon: <ChatBubbleLeftRightIcon className="w-4 h-4" /> },
            { id: 'history', label: t.tab_history, icon: <HistoryIcon className="w-4 h-4" /> }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-3 rounded-2xl transition-all flex items-center gap-2 text-xs font-black ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
              {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Workspace */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-6 md:p-12 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
            
            {loading && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
                <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="mt-8 text-indigo-400 font-black text-lg">{t.generating}</p>
              </div>
            )}

            {activeTab === 'single' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Identity */}
                  <div className="bg-slate-800/20 rounded-[2.5rem] border border-slate-700/40 p-8 space-y-6 shadow-inner">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <GlobeAltIcon className="w-5 h-5 text-indigo-400" /> {t.settings_identity}
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.lang_dialect}</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value as SpeechLanguage)} className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-bold outline-none appearance-none hover:border-indigo-500 transition-all">
                          <optgroup label={isAr ? 'العربية' : 'Arabic'}>
                            {languagesByCategory.Arabic.map(l => <option key={l} value={l}>{l}</option>)}
                          </optgroup>
                          <optgroup label={isAr ? 'الإنجليزية' : 'English'}>
                            {languagesByCategory.English.map(l => <option key={l} value={l}>{l}</option>)}
                          </optgroup>
                          <optgroup label={isAr ? 'لغات عالمية' : 'Global'}>
                            {languagesByCategory.Global.map(l => <option key={l} value={l}>{l}</option>)}
                          </optgroup>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.voice_timbre}</label>
                        <select value={voice} onChange={(e) => setVoice(e.target.value as VoiceName)} className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-bold outline-none appearance-none hover:border-indigo-500 transition-all">
                           {Object.values(VoiceName).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.persona}</label>
                        <select value={persona} onChange={(e) => setPersona(e.target.value as SpeakerPersona)} className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl px-5 py-4 text-xs font-bold outline-none appearance-none hover:border-indigo-500 transition-all">
                           {Object.values(SpeakerPersona).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Performance */}
                  <div className="bg-slate-800/20 rounded-[2.5rem] border border-slate-700/40 p-8 space-y-6 shadow-inner">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <AdjustmentsHorizontalIcon className="w-5 h-5 text-pink-400" /> {t.settings_performance}
                    </h3>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase px-1">{t.emotional_style}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.values(SpeechStyle).map(s => (
                            <button key={s} onClick={() => setStyle(s)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${style === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-300'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-800/50">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{t.speed}</span>
                          <span className="text-[10px] font-black text-indigo-400">{speed.toFixed(1)}x</span>
                        </div>
                        <input type="range" min="0.5" max="2" step="0.1" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full accent-indigo-500" />
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{t.pitch}</span>
                          <span className="text-[10px] font-black text-pink-400">{pitch < 0.9 ? t.pitch_deep : pitch > 1.1 ? t.pitch_high : t.pitch_normal}</span>
                        </div>
                        <input type="range" min="0.5" max="1.5" step="0.05" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full accent-pink-500" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Script Input Area */}
                <div className="space-y-6 bg-slate-950/40 p-8 rounded-[3.5rem] border border-slate-800 shadow-inner">
                   <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                         <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                         {t.text_area_label}
                      </h3>
                      {language.toString().includes('Arabic') && (
                        <button onClick={handleTashkeel} disabled={isTashkeeling || !text.trim()} className="px-5 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl text-[10px] font-black border border-indigo-500/30 transition-all flex items-center gap-2">
                           <LanguageIcon className={`w-4 h-4 ${isTashkeeling ? 'animate-spin' : ''}`} />
                           {isTashkeeling ? '...' : t.tashkeel_btn}
                        </button>
                      )}
                   </div>
                   <textarea 
                    value={text} onChange={(e) => setText(e.target.value)}
                    placeholder={t.text_area_placeholder}
                    className="w-full h-64 bg-transparent border-none text-2xl leading-relaxed outline-none focus:ring-0 placeholder:text-slate-800 italic"
                  />
                  <div className="flex justify-center pt-8">
                     <button onClick={() => handleGenerate('single')} disabled={loading || !text.trim()} className="group px-16 py-8 bg-white text-slate-950 rounded-[2.5rem] font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50">
                        <MicrophoneIcon className="w-6 h-6" /> {t.generate_btn}
                     </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other Tabs (Song, Story, Conversation) - Localized labels */}
            {activeTab === 'song' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1"><SongIcon className="w-4 h-4 text-pink-500" /> {t.song_genre}</label>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.values(VocalGenre).map(genre => (
                        <button key={genre} onClick={() => setVocalGenre(genre)} className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${vocalGenre === genre ? 'bg-pink-600 border-pink-500 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}`}>
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1"><AdjustmentsHorizontalIcon className="w-4 h-4 text-pink-500" /> {t.song_tempo}</label>
                    <div className="flex gap-3">
                      {['slow', 'medium', 'fast'].map((tm: any) => (
                        <button key={tm} onClick={() => setTempo(tm)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black border transition-all ${tempo === tm ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/40 border-slate-700/50 text-slate-400'}`}>
                          {tm}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.tab_song} Lyrics</label>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.song_placeholder} className="w-full h-40 bg-slate-900/30 border border-slate-800 rounded-[2rem] p-8 text-xl outline-none" />
                </div>
                <button onClick={() => handleGenerate('song')} disabled={loading || !text.trim()} className="w-full py-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3">
                  <MusicalNoteIcon className="w-6 h-6" /> {t.song_btn}
                </button>
              </div>
            )}

            {activeTab === 'story' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 bg-slate-800/20 border border-slate-800 rounded-[2rem] space-y-4">
                    <label className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2"><MusicalNoteIcon className="w-4 h-4 text-purple-500" /> {t.bgm_label}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {BGM_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => opt.id === 'custom' ? fileInputRef.current?.click() : setSelectedBgm(opt.id)} className={`py-3 px-4 rounded-xl text-[10px] font-black border transition-all ${selectedBgm === opt.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                          {isAr ? opt.nameAr : opt.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 bg-slate-800/20 border border-slate-800 rounded-[2rem] flex flex-col justify-center space-y-4">
                    <span className="text-[11px] font-black text-slate-500 uppercase">{t.mix_vol}</span>
                    <input type="range" min="0" max="0.5" step="0.01" value={bgmVolume} onChange={(e) => setBgmVolume(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-900 rounded-full accent-purple-500" />
                  </div>
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.story_placeholder} className="w-full h-52 bg-slate-900/30 border border-slate-800 rounded-[2rem] p-8 text-xl outline-none" />
                <button onClick={() => handleGenerate('story')} className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3">
                  <BookOpenIcon className="w-6 h-6" /> {t.story_btn}
                </button>
              </div>
            )}

            {activeTab === 'conversation' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-900/40 border border-indigo-500/10 rounded-[2.5rem] space-y-4 shadow-xl">
                    <label className="text-[10px] font-black text-indigo-400 uppercase">{t.conv_s1}</label>
                    <input value={speaker1Name} onChange={e => setSpeaker1Name(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                    <select value={speaker1Voice} onChange={e => setSpeaker1Voice(e.target.value as VoiceName)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-[10px]">
                      {Object.values(VoiceName).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="p-8 bg-slate-900/40 border border-pink-500/10 rounded-[2.5rem] space-y-4 shadow-xl">
                    <label className="text-[10px] font-black text-pink-400 uppercase">{t.conv_s2}</label>
                    <input value={speaker2Name} onChange={e => setSpeaker2Name(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                    <select value={speaker2Voice} onChange={e => setSpeaker2Voice(e.target.value as VoiceName)} className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-[10px]">
                      {Object.values(VoiceName).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase px-1">{t.conv_script}</label>
                  <textarea value={script} onChange={e => setScript(e.target.value)} className="w-full h-48 bg-slate-950/30 border border-slate-800 rounded-[2rem] p-8 font-mono text-sm leading-relaxed" />
                </div>
                <button onClick={() => handleGenerate('conversation')} className="w-full py-6 bg-slate-800 text-white font-black rounded-[1.8rem] flex items-center justify-center gap-3">
                  <ChatBubbleLeftRightIcon className="w-6 h-6" /> {t.conv_btn}
                </button>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex gap-3 mb-6 overflow-x-auto pb-4 scrollbar-hide">
                  {DEFAULT_COLLECTIONS(isAr).map(col => (
                    <button key={col.id} onClick={() => setSelectedCollection(col.id)} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all border whitespace-nowrap ${selectedCollection === col.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300'}`}>
                      {col.name}
                    </button>
                  ))}
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                  {history.filter(item => selectedCollection === 'all' || item.collectionId === selectedCollection).map(item => (
                    <div key={item.id} className="group p-6 bg-slate-900/40 border border-slate-800/50 rounded-[1.8rem] flex items-center justify-between hover:bg-slate-800/60 transition-all cursor-default">
                      <div className="flex-1 truncate pr-8">
                        <p className="text-sm font-black text-white truncate group-hover:text-indigo-400 transition-colors">{item.text}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[8px] font-black bg-indigo-500/10 px-2 py-1 rounded-lg text-indigo-400">{item.voice}</span>
                          <span className="text-[8px] font-bold text-slate-600">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setCurrentAudio(item); setIsPlaying(true); }} className="w-12 h-12 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><PlayIcon className="w-5 h-5"/></button>
                        <button onClick={() => setHistory(prev => prev.filter(i => i.id !== item.id))} className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-5 h-5"/></button>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <div className="text-center py-20 text-slate-600">{t.history_empty}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Studio Player Dashboard */}
        <div className="lg:col-span-4 space-y-8 sticky top-8">
          <div className="bg-slate-900/80 backdrop-blur-3xl border border-white/5 rounded-[3.5rem] p-10 shadow-2xl flex flex-col items-center justify-center min-h-[550px] ring-1 ring-white/10 relative overflow-hidden">
            
            {!currentAudio ? (
              <div className="text-center opacity-40">
                <SpeakerWaveIcon className="w-24 h-24 mx-auto mb-8 text-slate-300" />
                <p className="text-[11px] font-black uppercase text-indigo-400 mb-2">{t.studio_offline}</p>
                <p className="text-[10px] text-slate-600 font-bold max-w-[200px]">{t.studio_desc}</p>
              </div>
            ) : (
              <div className="w-full space-y-10 animate-in zoom-in-95 duration-700">
                <div className="text-center">
                  <div className="flex items-end justify-center gap-2 h-36 mb-10 px-4">
                    {vData.map((val, i) => (
                      <div key={i} className={`w-2.5 rounded-full transition-all duration-100 ${isPlaying ? 'bg-indigo-500' : 'bg-slate-800'}`} style={{ height: isPlaying ? `${Math.max(10, val * 100)}%` : '10px' }} />
                    ))}
                  </div>
                  <h3 className="text-white font-black text-xl truncate mb-3 px-6">{currentAudio.text}</h3>
                </div>

                <div className="space-y-8">
                  <div className="relative h-2.5 bg-slate-950 rounded-full overflow-hidden shadow-inner cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    if (audioRef.current) audioRef.current.currentTime = percent * audioRef.current.duration;
                  }}>
                    <div className="absolute inset-y-0 left-0 bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-center">
                    <button onClick={togglePlayback} className="w-24 h-24 bg-white text-slate-950 rounded-[2.5rem] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                      {isPlaying ? <PauseIcon className="w-12 h-12" /> : <PlayIcon className="w-12 h-12 translate-x-1.5" />}
                    </button>
                  </div>
                  <a href={currentAudio.url} download={`sawtify_${currentAudio.id}.wav`} className="w-full py-5 bg-slate-800/60 border border-slate-700/50 text-white text-[11px] font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
                    <ArrowDownTrayIcon className="w-5 h-5" /> {t.export_btn}
                  </a>
                </div>
                <audio ref={audioRef} src={currentAudio.url} onTimeUpdate={() => setProgress((audioRef.current!.currentTime / audioRef.current!.duration) * 100)} onEnded={() => setIsPlaying(false)} className="hidden" />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-20 py-10 opacity-30 text-[10px] font-black uppercase tracking-[0.5em] flex flex-col items-center gap-6">
        <div className="flex items-center gap-4">
          <span className="w-20 h-px bg-gradient-to-r from-transparent to-slate-700"></span>
          {isAr ? 'هندسة الصوت العالمية عبر الذكاء الاصطناعي' : 'GLOBAL AI VOICE ENGINEERING'}
          <span className="w-20 h-px bg-gradient-to-l from-transparent to-slate-700"></span>
        </div>
      </footer>

      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setCustomBgmUrl(url);
          setSelectedBgm('custom');
        }
      }} accept="audio/*" className="hidden" />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default App;