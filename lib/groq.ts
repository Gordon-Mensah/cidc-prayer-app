import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function extractTimeline(text: string): Promise<{ days: number | null, deadline: string | null }> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that extracts timeline information from prayer requests. 
Extract the number of days until a deadline or event.
Examples:
- "exam in 3 days" -> 3
- "surgery on Friday" -> calculate days until Friday from today
- "interview next week" -> 7
- "ongoing" -> null

Respond ONLY with a JSON object like: {"days": 3, "deadline": "Friday"} or {"days": null, "deadline": null}`
        },
        {
          role: "user",
          content: `Extract timeline from: "${text}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content || '{"days": null, "deadline": null}';
    const parsed = JSON.parse(response);
    return parsed;
  } catch (error) {
    console.error('Groq timeline extraction error:', error);
    return { days: null, deadline: null };
  }
}

export async function suggestBibleVerse(prayerRequest: string, category: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a compassionate Christian prayer support assistant. Suggest ONE relevant Bible verse (with reference) that would encourage someone with this prayer need. Keep it brief and comforting. Format: "verse text" - Reference`
        },
        {
          role: "user",
          content: `Prayer category: ${category}\nPrayer request: ${prayerRequest}\n\nSuggest an encouraging Bible verse:`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || "\"The Lord is close to the brokenhearted and saves those who are crushed in spirit.\" - Psalm 34:18";
  } catch (error) {
    console.error('Groq verse suggestion error:', error);
    return "\"The Lord is close to the brokenhearted and saves those who are crushed in spirit.\" - Psalm 34:18";
  }
}

export async function generateEncouragement(prayerRequest: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a compassionate Christian prayer warrior. Write a brief, heartfelt encouragement message (2-3 sentences) for someone with this prayer need. Be warm, hopeful, and Christ-centered.`
        },
        {
          role: "user",
          content: `Prayer request: ${prayerRequest}\n\nWrite encouragement:`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || "We're lifting you up in prayer. God is faithful and He hears every prayer.";
  } catch (error) {
    console.error('Groq encouragement error:', error);
    return "We're lifting you up in prayer. God is faithful and He hears every prayer.";
  }
}

export async function analyzePrayerTrends(requests: any[]): Promise<string> {
  try {
    const summary = requests.map(r => `${r.category}: ${r.title}`).join('\n');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a church leadership advisor. Analyze prayer request patterns and provide 3-4 bullet points of insights for church leaders. Focus on common themes, urgent needs, and pastoral care opportunities.`
        },
        {
          role: "user",
          content: `Recent prayer requests:\n${summary}\n\nProvide leadership insights:`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content || "Prayer trends analysis not available.";
  } catch (error) {
    console.error('Groq trends analysis error:', error);
    return "Prayer trends analysis not available.";
  }
}

export async function determineReminderFrequency(timeline: string | null, category: string): Promise<'daily' | 'twice-daily' | 'weekly'> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You determine prayer reminder frequency. 
Rules:
- Urgent/time-sensitive requests (surgery, exam, interview) -> "twice-daily"
- Ongoing critical needs (healing, financial crisis) -> "daily"
- Long-term requests (general guidance, ministry) -> "weekly"

Respond with ONLY one word: "daily", "twice-daily", or "weekly"`
        },
        {
          role: "user",
          content: `Timeline: ${timeline || 'ongoing'}\nCategory: ${category}\n\nRecommend frequency:`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.trim().toLowerCase() || 'daily';
    if (response.includes('twice')) return 'twice-daily';
    if (response.includes('weekly')) return 'weekly';
    return 'daily';
  } catch (error) {
    console.error('Groq frequency error:', error);
    return 'daily';
  }
}