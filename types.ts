
export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
  Aoede = 'Aoede',
  Eos = 'Eos',
  Helios = 'Helios',
  Icarus = 'Icarus',
  Leda = 'Leda',
  Orpheus = 'Orpheus'
}

export enum SpeechStyle {
  Neutral = 'Neutral',
  Cheerful = 'Cheerful',
  Serious = 'Serious',
  Whispering = 'Whispering',
  Dramatic = 'Dramatic',
  Energetic = 'Energetic',
  Storyteller = 'Storyteller'
}

export enum SpeechLanguage {
  Arabic_Fusha = 'Arabic (Fusha)',
  Arabic_Egyptian = 'Arabic (Egyptian)',
  Arabic_Gulf = 'Arabic (Gulf)',
  Arabic_Levantine = 'Arabic (Levantine)',
  Arabic_Maghrebi = 'Arabic (Maghrebi)',
  Arabic_Sudanese = 'Arabic (Sudanese)',
  Arabic_Iraqi = 'Arabic (Iraqi)',
  English_US = 'English (US)',
  English_UK = 'English (UK)',
  English_AU = 'English (Australia)',
  English_IN = 'English (India)',
  French = 'French',
  Spanish = 'Spanish',
  German = 'German',
  Chinese = 'Chinese',
  Japanese = 'Japanese',
  Russian = 'Russian',
  Turkish = 'Turkish',
  Italian = 'Italian',
  Portuguese = 'Portuguese',
  Korean = 'Korean'
}

export enum VocalGenre {
  Rap = 'Rap',
  Melodic = 'Melodic',
  Chant = 'Chant',
  Soulful = 'Soulful',
  Opera = 'Opera',
  Lullaby = 'Lullaby'
}

export enum SpeakerPersona {
  Default = 'Default',
  NewsAnchor = 'NewsAnchor',
  Narrator = 'Narrator',
  Teacher = 'Teacher',
  CustomerSupport = 'CustomerSupport',
  Poet = 'Poet'
}

export interface SpeechRequest {
  text: string;
  voice: VoiceName;
  style: SpeechStyle;
  language: SpeechLanguage;
  persona: SpeakerPersona;
  speed: number;
  pitch: number; // Numeric value: 0.5 to 1.5
}

export interface SongRequest {
  text: string;
  voice: VoiceName;
  genre: VocalGenre;
  tempo: 'slow' | 'medium' | 'fast';
}

export interface ConversationRequest {
  script: string;
  speaker1: { name: string; voice: VoiceName };
  speaker2: { name: string; voice: VoiceName };
}

export interface GeneratedAudio {
  id: string;
  text: string;
  url: string;
  timestamp: Date;
  voice: string;
  type: 'single' | 'conversation' | 'story' | 'song';
  collectionId?: string;
  bgm?: string;
}

export const BGM_OPTIONS = [
  { id: 'none', name: 'None', nameAr: 'بدون موسيقى', url: '' },
  { id: 'calm', name: 'Calm Piano', nameAr: 'بيانو هادئ', url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Beethoven_Moonlight_1st_movement.ogg' },
  { id: 'dramatic', name: 'Dramatic Orchestral', nameAr: 'أوركسترا درامية', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Ride_of_the_Valkyries.ogg' },
  { id: 'epic', name: 'Epic March', nameAr: 'مسيرة ملحمية', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Holst_-_The_Planets%2C_Op._32_-_I._Mars%2C_the_Bringer_of_War.ogg' },
  { id: 'custom', name: 'Custom Music ⬆️', nameAr: 'موسيقى مخصصة ⬆️', url: 'upload' }
];

export const DEFAULT_COLLECTIONS = (isAr: boolean) => [
  { id: 'all', name: isAr ? 'الكل' : 'All', icon: 'All' },
  { id: 'stories', name: isAr ? 'قصص' : 'Stories', icon: 'Book' },
  { id: 'songs', name: isAr ? 'أغاني' : 'Songs', icon: 'MusicalNote' },
  { id: 'work', name: isAr ? 'عمل' : 'Work', icon: 'Briefcase' }
];
