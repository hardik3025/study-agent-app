import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

type DetectConceptRequest = {
  userMessage: string;
};

type DetectConceptResponse = {
  subject: string;
  concept: string;
};

const MODEL_ID = 'claude-sonnet-4-5';

function parseJsonOutput(text: string): DetectConceptResponse {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    return { subject: '', concept: '' };
  }

  const jsonText = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(jsonText) as Partial<DetectConceptResponse>;
    return {
      subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : '',
      concept: typeof parsed.concept === 'string' ? parsed.concept.trim() : '',
    };
  } catch {
    return { subject: '', concept: '' };
  }
}

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body: DetectConceptRequest = await req.json();
  const userMessage = body.userMessage?.trim();

  if (!userMessage) {
    return NextResponse.json({ error: 'Missing userMessage in request body.' }, { status: 400 });
  }

  const prompt = `Extract the study subject and concept from the user message. Return only valid JSON with exactly two fields: subject and concept. If the message is not about studying a concept, return subject: "" and concept: "".

User message: ${JSON.stringify(userMessage)}\n\nResponse:`;

  const result = await generateText({
    model: anthropic.languageModel(MODEL_ID),
    prompt,
    temperature: 0,
  });

  const text = typeof result.text === 'string' ? result.text : '';
  const output = parseJsonOutput(text);

  return NextResponse.json(output);
}
