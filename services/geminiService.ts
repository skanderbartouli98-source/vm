
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, SpeechStyle, SpeechLanguage, SpeakerPersona, VocalGenre, SpeechRequest, SongRequest, ConversationRequest } from "../types";
import { decode, decodeAudioData, audioBufferToWav } from "../utils/audio";

const MODEL_NAME = 'gemini-2.5-flash-preview-tts';
const TEXT_MODEL = 'gemini-3-flash-preview';

export class GeminiTTSService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async addDiacritics(text: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: TEXT_MODEL,
      contents: `قم بإضافة التشكيل الكامل (الفتحة، الضمة، الكسرة، السكون) للنص العربي التالي بدقة لغوية عالية ليتم استخدامه في تحويل النص إلى كلام:
      
      النص: "${text}"`,
    });
    return response.text || text;
  }

  async generateSong(request: SongRequest): Promise<{ url: string; audioBuffer: AudioBuffer }> {
    const genreInstructions: Record<VocalGenre, string> = {
      [VocalGenre.Rap]: "بأسلوب الراب السريع مع إيقاع لفظي قوي: ",
      [VocalGenre.Melodic]: "بأسلوب غنائي ملحن بنغمات منسابة: ",
      [VocalGenre.Chant]: "بأسلوب الترانيم الرزينة: ",
      [VocalGenre.Soulful]: "بأسلوب غنائي عاطفي عميق: ",
      [VocalGenre.Opera]: "بأسلوب الأوبرا الكلاسيكي بقوة صوتية: ",
      [VocalGenre.Lullaby]: "بأسلوب أغنية مهد للأطفال ناعمة وهادئة: "
    };

    const tempoMap = {
      slow: "بإيقاع بطيء: ",
      medium: "بإيقاع متزن: ",
      fast: "بإيقاع سريع وحماسي: "
    };

    const prompt = `${tempoMap[request.tempo]}${genreInstructions[request.genre]}${request.text}`;

    const response = await this.ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: request.voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Vocal generation failed.");

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);

    return { url, audioBuffer: buffer };
  }

  async generateSingleSpeaker(request: SpeechRequest): Promise<{ url: string; audioBuffer: AudioBuffer }> {
    const stylePrefixMap: Record<string, string> = {
      Cheerful: "بلهجة مرحة: ", Serious: "بلهجة جادة: ", Whispering: "بصوت هامس: ",
      Dramatic: "بأسلوب درامي: ", Energetic: "بلهجة حماسية: ", Storyteller: "بأسلوب حكواتي: ", Neutral: ""
    };

    const languagePrefixMap: Record<string, string> = {
      [SpeechLanguage.Arabic_Fusha]: "باللغة العربية الفصحى: ", [SpeechLanguage.Arabic_Egyptian]: "بلهجة مصرية: ",
      [SpeechLanguage.Arabic_Gulf]: "بلهجة خليجية: ", [SpeechLanguage.Arabic_Levantine]: "بلهجة شامية: ",
      [SpeechLanguage.Arabic_Maghrebi]: "بلهجة مغاربية: ", [SpeechLanguage.Arabic_Sudanese]: "بلهجة سودانية: ",
      [SpeechLanguage.Arabic_Iraqi]: "بلهجة عراقية: ", [SpeechLanguage.English_US]: "In standard US English: ",
      [SpeechLanguage.English_UK]: "In standard UK English: ", [SpeechLanguage.English_AU]: "In standard Australian English: ",
      [SpeechLanguage.English_IN]: "In standard Indian English: ", [SpeechLanguage.French]: "En français: ",
      [SpeechLanguage.Spanish]: "En español: ", [SpeechLanguage.German]: "Auf Deutsch: ",
      [SpeechLanguage.Chinese]: "用中文 (In Chinese): ", [SpeechLanguage.Japanese]: "日本語で (In Japanese): ",
      [SpeechLanguage.Russian]: "На русском (In Russian): ", [SpeechLanguage.Turkish]: "Türkçe (In Turkish): ",
      [SpeechLanguage.Italian]: "In italiano: ", [SpeechLanguage.Portuguese]: "Em português: ", [SpeechLanguage.Korean]: "한국어로 (In Korean): "
    };

    const personaPrefixMap: Record<string, string> = {
      NewsAnchor: "كمذيع أخبار محترف: ", Narrator: "كراوي وثائقي: ", Teacher: "كأستاذ يشرح: ",
      CustomerSupport: "كخدمة عملاء: ", Poet: "كشاعر يلقي قصيدة: ", Default: ""
    };

    // Pitch Handling
    let pitchInstruction = "";
    if (request.pitch < 0.8) pitchInstruction = "بصوت رخيم جداً ومنخفض الطبقة: ";
    else if (request.pitch < 0.95) pitchInstruction = "بصوت رخيم: ";
    else if (request.pitch > 1.2) pitchInstruction = "بصوت حاد جداً ومرتفع الطبقة: ";
    else if (request.pitch > 1.05) pitchInstruction = "بصوت حاد قليلاً: ";

    // Speed Handling
    let speedInstruction = "";
    if (request.speed < 0.8) speedInstruction = "تحدث ببطء شديد: ";
    else if (request.speed > 1.3) speedInstruction = "تحدث بسرعة كبيرة: ";

    const prompt = `${speedInstruction}${pitchInstruction}${languagePrefixMap[request.language]}${personaPrefixMap[request.persona]}${stylePrefixMap[request.style]}${request.text}`;

    const response = await this.ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: request.voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed.");

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);

    return { url, audioBuffer: buffer };
  }

  async generateConversation(request: ConversationRequest): Promise<{ url: string; audioBuffer: AudioBuffer }> {
    const prompt = `Convert this dialogue into realistic audio: ${request.script}`;
    const response = await this.ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: request.speaker1.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: request.speaker1.voice } } },
              { speaker: request.speaker2.name, voiceConfig: { prebuiltVoiceConfig: { voiceName: request.speaker2.voice } } }
            ]
          }
        }
      }
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Conversation failed.");
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
    const wavBlob = audioBufferToWav(buffer);
    return { url: URL.createObjectURL(wavBlob), audioBuffer: buffer };
  }
}
