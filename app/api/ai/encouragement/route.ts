import { NextRequest, NextResponse } from 'next/server';
import { generateEncouragement } from '@/lib/groq';

export async function POST(request: NextRequest) {
  try {
    const { prayerRequest } = await request.json();
    
    if (!prayerRequest) {
      return NextResponse.json({ error: 'Prayer request required' }, { status: 400 });
    }

    const encouragement = await generateEncouragement(prayerRequest);
    
    return NextResponse.json({ encouragement });
  } catch (error) {
    console.error('Encouragement generation error:', error);
    return NextResponse.json({ 
      encouragement: "We're lifting you up in prayer. God is faithful and He hears every prayer." 
    }, { status: 200 });
  }
}