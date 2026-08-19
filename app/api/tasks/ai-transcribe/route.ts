import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NVIDIA_API_KEY;
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ message: 'No audio file provided' }, { status: 400 });
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
