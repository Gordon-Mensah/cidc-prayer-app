import { NextRequest, NextResponse } from 'next/server';
import { extractTimeline } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const timeline = await extractTimeline(text);
    
    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Timeline extraction error:', error);
    return NextResponse.json({ days: null, deadline: null }, { status: 200 });
  }
}