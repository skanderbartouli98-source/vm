
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext | OfflineAudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * دمج مسارين صوتيين (كلام + موسيقى) في ملف واحد
 */
export async function mixAudio(speechBuffer: AudioBuffer, bgmUrl: string, bgmVolume: number = 0.2): Promise<Blob> {
  const offlineCtx = new OfflineAudioContext(
    speechBuffer.numberOfChannels,
    speechBuffer.length,
    speechBuffer.sampleRate
  );

  // مسار الكلام
  const speechSource = offlineCtx.createBufferSource();
  speechSource.buffer = speechBuffer;
  speechSource.connect(offlineCtx.destination);

  // مسار الموسيقى (إذا وجدت)
  if (bgmUrl) {
    try {
      const response = await fetch(bgmUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const bgmBuffer = await offlineCtx.decodeAudioData(arrayBuffer);
      
      const bgmSource = offlineCtx.createBufferSource();
      bgmSource.buffer = bgmBuffer;
      bgmSource.loop = true;
      
      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = bgmVolume;
      
      bgmSource.connect(gainNode);
      gainNode.connect(offlineCtx.destination);
      bgmSource.start(0);
    } catch (e) {
      console.error("Failed to load BGM for mixing", e);
      // Proceed without BGM rather than crashing
    }
  }

  speechSource.start(0);
  const renderedBuffer = await offlineCtx.startRendering();
  return audioBufferToWav(renderedBuffer);
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const channels = [];
  let i, sample, offset = 0, pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels);
  setUint16(buffer.numberOfChannels * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (i = 0; i < buffer.numberOfChannels; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }
  return new Blob([view], { type: 'audio/wav' });
}
