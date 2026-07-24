import { NextResponse } from 'next/server';
import { callNvidiaAI } from '@/lib/nvidia-ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      jobTitle, 
      department, 
      designation, 
      location, 
      employmentType, 
      experienceRequired,
      salaryRange,
      description,
      requirements,
      responsibilities,
      jobId
    } = body;

    if (!jobTitle || !department) {
      return NextResponse.json({ message: 'Missing required job details' }, { status: 400 });
    }

    // Build prompt for AI
    const prompt = `Write a professional and engaging LinkedIn job post for the following position:

Job Title: ${jobTitle}
Department: ${department}
Designation: ${designation || 'Not specified'}
Location: ${location || 'Not specified'}
Employment Type: ${employmentType || 'Full-time'}
Experience Required: ${experienceRequired || 'Not specified'}
${salaryRange ? `Salary Range: ${salaryRange}` : ''}

Job Description:
${description || 'Not provided'}

Key Requirements:
${requirements?.join('\n') || 'Not specified'}

Responsibilities:
${responsibilities?.join('\n') || 'Not specified'}

Job ID: ${jobId || 'TBD'}

Guidelines:
1. Start with an attention-grabbing opening about the opportunity
2. Mention the role, department, and location
3. Highlight 2-3 key requirements or responsibilities
4. Include a compelling call-to-action for applying
5. Add relevant hashtags at the end (5-7 hashtags)
6. Keep it professional yet engaging (150-200 words)
7. Use emojis sparingly (2-3 max)
8. End with "To apply, mention Job ID: ${jobId || 'TBD'} in your email subject"

Generate the LinkedIn post:`;

    const generatedContent = await callNvidiaAI(prompt, {
      maxTokens: 1024,
      temperature: 0.8,
    });

    if (!generatedContent) {
      return NextResponse.json({ message: 'Failed to generate content' }, { status: 500 });
    }

    return NextResponse.json({ 
      content: generatedContent.trim(),
      jobId 
    });

  } catch (error: any) {
    console.error('Error generating LinkedIn post:', error);
    
    // If NVIDIA API fails, return a fallback message
    if (error.message?.includes('NVIDIA_API_KEY')) {
      return NextResponse.json({ 
        message: 'NVIDIA API key not configured',
        error: error.message 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Error generating LinkedIn post', 
      error: error.message 
    }, { status: 500 });
  }
}
