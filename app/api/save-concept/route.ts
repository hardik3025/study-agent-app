import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

type SaveConceptRequest = {
  subject: string;
  concept: string;
  masteryLevel: string;
  overviewGist: string;
  deepDiveGist: string[];
  strongAreas: string[];
  weakAreas: string[];
  nextSteps: string[];
  notes: string;
  progressPercentage?: number;
  quizScore?: number;
  completedTopics?: number;
  resumePoint?: string;
  completed?: boolean;
};

export async function POST(req: Request) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const body: SaveConceptRequest = await req.json();
  const subject = body.subject?.trim();
  const concept = body.concept?.trim();

  if (!subject || !concept) {
    return NextResponse.json({ error: 'Missing subject or concept in request body.' }, { status: 400 });
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const payloadVariants = [
    {
      subject,
      concept,
      mastery_level: body.masteryLevel,
      overview_gist: body.overviewGist,
      deep_dive_gist: body.deepDiveGist,
      strong_areas: body.strongAreas,
      weak_areas: body.weakAreas,
      next_steps: body.nextSteps,
      notes: body.notes,
      progress_percentage: body.progressPercentage ?? null,
      quiz_score: body.quizScore ?? null,
      completed_topics: body.completedTopics ?? null,
      resume_point: body.resumePoint ?? null,
      last_updated: new Date().toISOString(),
    },
    {
      subject,
      concept,
      mastery_level: body.masteryLevel,
      overview_gist: body.overviewGist,
      notes: body.notes,
      last_updated: new Date().toISOString(),
    },
    {
      subject,
      concept,
      notes: body.notes,
      last_updated: new Date().toISOString(),
    },
    {
      subject,
      concept,
      last_updated: new Date().toISOString(),
    },
  ];

  let lastError: Error | null = null;
  for (const payload of payloadVariants) {
    const { error } = await supabase
      .from('concepts')
      .upsert(payload, { onConflict: 'subject,concept' });

    if (!error) {
      return NextResponse.json({ success: true });
    }

    lastError = error;
    const message = error.message ?? '';
    if (!message.includes('Could not find the') && !message.includes('does not exist')) {
      break;
    }
  }

  console.error('save-concept route failed', lastError);
  return NextResponse.json({ error: lastError?.message ?? 'Failed to save concept.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
