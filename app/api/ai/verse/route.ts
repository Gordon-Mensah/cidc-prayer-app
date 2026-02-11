import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { prayerRequest, category } = await request.json();
    
    if (!prayerRequest || !category) {
      return NextResponse.json({ error: 'Prayer request and category required' }, { status: 400 });
    }

    if (!GROQ_API_KEY) {
      console.error('GROQ_API_KEY not found');
      return NextResponse.json({ 
        verse: '"The Lord is close to the brokenhearted and saves those who are crushed in spirit." - Psalm 34:18' 
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate Christian prayer support assistant. Suggest ONE relevant Bible verse (with reference) that would encourage someone with this prayer need. Keep it brief and comforting. Format: "verse text" - Reference'
          },
          {
            role: 'user',
            content: `Prayer category: ${category}\nPrayer request: ${prayerRequest}\n\nSuggest an encouraging Bible verse:`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      })
    });

    const data = await response.json();
    const verse = data.choices?.[0]?.message?.content || '"The Lord is close to the brokenhearted and saves those who are crushed in spirit." - Psalm 34:18';
    
    return NextResponse.json({ verse });
  } catch (error) {
    console.error('Verse suggestion error:', error);
    return NextResponse.json({ 
      verse: '"The Lord is close to the brokenhearted and saves those who are crushed in spirit." - Psalm 34:18' 
    });
  }
}