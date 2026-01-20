import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Modality } from '@google/genai';
import { supabase } from '@/lib/supabase';
import { checkUserCredits, deductCredit } from '@/lib/subscription';

// Force Node.js runtime for Buffer support
export const runtime = 'nodejs';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

// Content safety filter - checks for inappropriate content
// Only blocks truly harmful content, allows mild tension in stories
const UNSAFE_KEYWORDS = [
  'ölüm', 'öldür', 'öldürmek', 'kan', 'kanlı', 'şiddet', 'şiddetli',
  'silah', 'tabanca', 'tüfek', 'bıçak', 'keskin', 'yaralama',
  'kabus', 'zombi', 'dehşet', 'korkunç', 'berbat'
];

function containsUnsafeContent(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Count how many unsafe keywords appear
  let unsafeCount = 0;
  for (const keyword of UNSAFE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      unsafeCount++;
    }
  }

  // Only block if multiple unsafe keywords appear (likely truly harmful)
  // Single mild words like "korku" in context are OK for children's stories
  return unsafeCount >= 2;
}

// Helper function to convert Uint8Array to base64
function uint8ToBase64(u8: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunkSize));
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

// WAV header generator for PCM audio
function makeWavFromPcm16Mono(pcm: Uint8Array, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.byteLength;
  const buffer = Buffer.alloc(44 + dataSize);

  let offset = 0;
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(36 + dataSize, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;          // PCM chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;           // format = PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // PCM data
  Buffer.from(pcm).copy(buffer, offset);

  return buffer;
}

interface GenerateRequest {
  topic: string;
  ageRange?: '3-5' | '6-8';
  length?: 'short' | 'medium';
  theme?: 'friendship' | 'courage' | 'sharing' | 'emotions';
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get user session and check credits
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Lütfen giriş yapın.' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check if user has credits
    const hasCredits = await checkUserCredits(user.id);
    if (!hasCredits) {
      return NextResponse.json(
        { error: 'Kredi limitiniz doldu. Lütfen paketinizi yükseltin.', needsUpgrade: true },
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen bir dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Validate API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'API yapılandırma hatası. Lütfen daha sonra tekrar deneyin.' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { topic, ageRange = '3-5', length = 'short', theme = 'friendship' } = body;

    // Validate input
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'Lütfen bir konu girin.' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    if (topic.length > 120) {
      return NextResponse.json(
        { error: 'Konu çok uzun. Maksimum 120 karakter olmalı.' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Check for unsafe content in input
    if (containsUnsafeContent(topic)) {
      return NextResponse.json(
        { error: 'Bu konu çocuklar için uygun değil. Lütfen farklı bir konu deneyin.' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Initialize Google Generative AI
    const ai = new GoogleGenAI({ apiKey });

    // STEP 1: Generate story with gemini-2.5-flash
    const storyStartTime = Date.now();

    // Build context-aware prompt
    const lengthGuide = length === 'short' ? '150-200 kelime' : '250-350 kelime';
    const ageGuide = ageRange === '3-5'
      ? 'Basit kelimeler, tekrarlayan cümleler, renkli betimlemeler kullan.'
      : 'Biraz daha karmaşık kelimeler ve cümleler kullanabilirsin, ama yine de anlaşılır ol.';

    const themeGuide: Record<string, string> = {
      friendship: 'Arkadaşlık ve birlikte güçlü olmak temasını işle.',
      courage: 'Cesaret ve korkuların üstesinden gelme temasını işle.',
      sharing: 'Paylaşmanın güzelliği ve cömertlik temasını işle.',
      emotions: 'Duyguları anlama ve ifade etme temasını işle.'
    };

    const storyPrompt = `Sen çocuklar için masal yazan bir yazarsın. Aşağıdaki kurallara göre bir masal yaz:

KONU: ${topic}

KURALLAR:
1. Yaş grubu: ${ageRange} yaş. ${ageGuide}
2. Uzunluk: ${lengthGuide} arası.
3. Tema: ${themeGuide[theme]}
4. Mutlaka mutlu sonla bitir.
5. ŞİDDET, KORKU, ÖLÜM, KABUS gibi OLUMSUZ içeriklerden TAMAMEN KAÇIN.
6. Eğitici ve pozitif bir mesaj ver.
7. Masalın başlığını YAZMA, doğrudan hikayeye başla.
8. Sadece masal metnini yaz, başka hiçbir şey ekleme.

Şimdi masalı yaz:`;

    const storyRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: storyPrompt,
    });

    const story = (storyRes.text ?? '').trim();
    const storyEndTime = Date.now();

    if (!story) {
      return NextResponse.json(
        { error: 'Hikaye üretilemedi. Lütfen tekrar deneyin.' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // Validate story length
    if (story.length > 2500) {
      return NextResponse.json(
        { error: 'Üretilen hikaye çok uzun. Lütfen tekrar deneyin.' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // STEP 2: Safety check on generated story
    if (containsUnsafeContent(story)) {
      console.warn('Generated story contains unsafe content, regenerating...');
      return NextResponse.json(
        { error: 'Oluşturulan hikaye uygun olmadı. Lütfen farklı bir konu deneyin.' },
        { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    // STEP 3: Generate TTS with gemini-2.5-flash-preview-tts
    const ttsStartTime = Date.now();

    const ttsRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Aşağıdaki masalı masal anlatır gibi, sıcak ve sakin bir tonla oku. ' +
                    'Vurgu ve duraklamaları doğal yap.\n\n' +
                    story,
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const ttsEndTime = Date.now();

    // STEP 4: Extract audio data from response
    const parts: any[] = ttsRes?.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p?.inlineData?.data);

    if (!audioPart?.inlineData?.data) {
      console.error('TTS response structure:', JSON.stringify(parts.map(p => Object.keys(p ?? {})), null, 2));
      return NextResponse.json(
        { error: 'TTS audio bulunamadı. Lütfen tekrar deneyin.' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const inline = audioPart.inlineData;

    // inline.data can be string (base64) or Uint8Array
    let audioB64: string;
    if (typeof inline.data === 'string') {
      audioB64 = inline.data;
    } else if (inline.data instanceof Uint8Array) {
      audioB64 = uint8ToBase64(inline.data);
    } else if (Array.isArray(inline.data)) {
      audioB64 = uint8ToBase64(Uint8Array.from(inline.data));
    } else {
      return NextResponse.json(
        { error: 'TTS audio formatı tanınmadı.' },
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const mimeType = (inline.mimeType as string | undefined) ?? 'audio/wav';

    // Convert to WAV if needed (for browser compatibility)
    let finalAudioBase64: string;
    let finalMimeType: string;

    if (mimeType !== 'audio/wav') {
      const pcmBytes = Buffer.from(audioB64, 'base64');
      const wav = makeWavFromPcm16Mono(new Uint8Array(pcmBytes), 24000);
      finalAudioBase64 = wav.toString('base64');
      finalMimeType = 'audio/wav';
    } else {
      finalAudioBase64 = audioB64;
      finalMimeType = mimeType;
    }

    const endTime = Date.now();

    // Deduct credit from user
    const deductResult = await deductCredit(user.id);
    if (!deductResult.success) {
      console.error('Credit deduction failed:', deductResult.error);
      // Still return the story but log the error
    }

    // Return successful response
    return NextResponse.json({
      story,
      audioBase64: finalAudioBase64,
      mimeType: finalMimeType,
      meta: {
        totalTime: endTime - startTime,
        storyGenerationTime: storyEndTime - storyStartTime,
        ttsGenerationTime: ttsEndTime - ttsStartTime,
        storyLength: story.length,
      }
    }, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('API Error:', error);

    // User-friendly error messages
    let userMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';

    if (error.message?.includes('API key')) {
      userMessage = 'API yapılandırma hatası. Lütfen daha sonra tekrar deneyin.';
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      userMessage = 'Servis şu anda yoğun. Lütfen birkaç dakika sonra tekrar deneyin.';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }

    return NextResponse.json(
      {
        error: userMessage,
        ...(process.env.NODE_ENV === 'development' && { detail: error.message })
      },
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }
}
