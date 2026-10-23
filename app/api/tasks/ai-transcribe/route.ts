import { NextRequest, NextResponse } from 'next/server';
import { getAuthInfo } from '@/lib/auth-util';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a',
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg',
  'audio/aac', 'audio/flac', 'audio/x-flac', 'video/mp4',
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthInfo();
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const apiKey = process.env.NVIDIA_API_KEY;
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ message: 'No audio file provided' }, { status: 400 });
    }

    if ((file as File).size && (file as File).size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ message: 'Audio exceeds the 25MB limit' }, { status: 413 });
    }

    if ((file as File).type && !ALLOWED_AUDIO_MIME_TYPES.has((file as File).type)) {
      return NextResponse.json({ message: 'Audio type not allowed' }, { status: 415 });
    }

    if (!apiKey) {
      return NextResponse.json({ message: 'NVIDIA API key not configured' }, { status: 500 });
    }

    const nvidiaForm = new FormData();
    nvidiaForm.append('file', file, 'audio.m4a');
    nvidiaForm.append('model', 'nvidia/parakeet-ctc-0.6b');
    nvidiaForm.append('response_format', 'text');

    const res = await fetch('https://integrate.api.nvidia.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: nvidiaForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('NVIDIA transcription notice:', errText);
      return NextResponse.json({ text: '' }, { status: 200 });
    }

    const text = await res.text();
    return NextResponse.json({ text: text.trim() }, { status: 200 });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ text: '', error: error.message }, { status: 200 });
  }
}
