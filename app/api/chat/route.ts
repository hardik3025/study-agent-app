import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient } from '../../../lib/supabase';

type ChatRequestBody = {
  userMessage: string;
  subject?: string;
  concept?: string;
};

type ConceptRow = {
  mastery_level?: string | null;
  weak_areas?: string | null;
  strong_areas?: string | null;
};

const MODEL_ID = 'claude-sonnet-4-5';

function buildSystemPrompt(subject: string | null, concept: string | null, row: ConceptRow | null) {
  const topicLabel = subject && concept ? `the concept "${concept}" in "${subject}"` : 'the requested topic';
  if (!row) {
    return `You are a patient AI tutor. Explain ${topicLabel} in a beginner-friendly way. Start with an analogy, define all terms clearly, and make the explanation easy to follow.`;
  }

  const weakAreas = row.weak_areas ? ` Weak areas: ${row.weak_areas}.` : '';
  const strongAreas = row.strong_areas ? ` Strong areas: ${row.strong_areas}.` : '';
  const context = `The student is studying ${topicLabel}.${weakAreas}${strongAreas}`;

  const mastery = row.mastery_level ?? '';
  if (mastery === 'Introduced' || mastery === 'Developing') {
    return `You are an AI learning coach. ${context} Reference prior knowledge, mention the student's weak areas, and teach at a moderate pace. Use supportive language and help the student connect new ideas to what they already know.`;
  }

  if (mastery === 'Proficient' || mastery === 'Strong') {
    return `You are an expert AI tutor. ${context} Skip the basics, focus on technical nuance, and explain advanced details. Assume the student has solid familiarity and build on their strengths while still acknowledging any weak areas.`;
  }

  return `You are an AI tutor. ${context} Teach at a reasonable pace with helpful explanations and explicit definitions when needed.`;
}

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body: ChatRequestBody = await req.json();
  const userMessage = body.userMessage?.trim();
  const subject = body.subject?.trim() || null;
  const concept = body.concept?.trim() || null;

  if (!userMessage) {
    return NextResponse.json({ error: 'Missing userMessage in request body.' }, { status: 400 });
  }

  let row: ConceptRow | null = null;
  if (subject && concept) {
    const supabase = createClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('concepts')
          .select('mastery_level, weak_areas, strong_areas')
          .eq('subject', subject)
          .eq('concept', concept)
          .maybeSingle();

        if (error) {
          console.error('chat route concept lookup failed', error);
        } else if (data) {
          row = data as ConceptRow;
        }
      } catch (error) {
        console.error('chat route concept lookup crashed', error);
      }
    }
  }

  const systemPrompt = buildSystemPrompt(subject, concept, row);
  const result = streamText({
    model: anthropic.chat(MODEL_ID),
    instructions: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  return result.toTextStreamResponse();
}
