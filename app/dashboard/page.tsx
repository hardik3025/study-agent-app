import Link from 'next/link';
import { createClient } from '../../lib/supabase';

type ConceptRow = {
  id?: number;
  subject: string;
  concept: string;
  mastery_level?: string | null;
  strong_areas?: string[] | null;
  weak_areas?: string[] | null;
  next_steps?: string[] | null;
  progress_percentage?: number | null;
  quiz_score?: number | null;
  completed_topics?: number | null;
  resume_point?: string | null;
  completed?: boolean | null;
  last_updated?: string | null;
};

const subjectColors: Record<string, string> = {
  Physics: 'bg-blue-500',
  Biology: 'bg-emerald-500',
  Mathematics: 'bg-violet-500',
  'Computer Science': 'bg-orange-500',
  Chemistry: 'bg-red-500',
};

const masteryScore: Record<string, number> = {
  Strong: 4,
  Proficient: 3,
  Developing: 2,
  Introduced: 1,
  'In Progress': 0,
};

function formatDate(dateValue?: string | null) {
  if (!dateValue) return 'Unknown';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function normalizeArray(value: string[] | null | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

export default async function DashboardPage() {
  const supabase = createClient();

  if (!supabase) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-yellow-700 bg-slate-900/90 p-8 text-yellow-200">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-4">Supabase is not configured yet. Add the public URL and anon key to continue loading concepts.</p>
          </div>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase.from('concepts').select('*');
  const rows = Array.isArray(data) ? data : [];

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-700 bg-slate-900/90 p-8 text-red-200">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-4">Failed to load concepts: {error.message}</p>
          </div>
        </div>
      </main>
    );
  }

  const totalConcepts = rows.length;
  const uniqueSubjects = new Set(rows.map((row) => row.subject)).size;
  const progressValues = rows.map((row) => row.progress_percentage ?? (masteryScore[row.mastery_level ?? 'In Progress'] ?? 0) * 25);
  const averagePercentage = progressValues.length > 0 ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0;
  const completedTopicsCount = rows.filter((row) => row.completed_topics != null ? row.completed_topics > 0 : ['Strong', 'Proficient'].includes(row.mastery_level ?? '')).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-4 shadow-xl shadow-slate-950/20">
          <div className="text-lg font-semibold text-white">Study Agent</div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Link href="/" className="rounded-full px-4 py-2 transition hover:bg-slate-800 hover:text-white">Chat</Link>
            <Link href="/dashboard" className="rounded-full bg-slate-800 px-4 py-2 text-white transition hover:bg-slate-700">Dashboard</Link>
          </div>
        </nav>

        <section className="mb-8 rounded-[2rem] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">Concept study summary</h1>
            </div>
            <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
              Updated live from Supabase
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Total concepts</p>
              <p className="mt-3 text-3xl font-semibold text-white">{totalConcepts}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Subjects</p>
              <p className="mt-3 text-3xl font-semibold text-white">{uniqueSubjects}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Average mastery</p>
              <p className="mt-3 text-3xl font-semibold text-white">{averagePercentage}%</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          {rows.map((row) => {
            const subjectColor = subjectColors[row.subject] ?? 'bg-slate-600';
            const mastery = row.mastery_level ?? 'In Progress';
            const strongAreas = normalizeArray(row.strong_areas);
            const weakAreas = normalizeArray(row.weak_areas);
            const nextSteps = normalizeArray(row.next_steps);
            const progressPercent = row.progress_percentage ?? Math.round((masteryScore[mastery] ?? 0) * 25);
            const quizScore = row.quiz_score != null ? `${row.quiz_score}%` : 'Not set';
            const completedTopics = row.completed_topics ?? (['Strong', 'Proficient'].includes(mastery) ? 1 : 0);
            const resumePoint = row.resume_point ?? row.notes?.slice(0, 120) ?? 'Not available';

            return (
              <details
                key={`${row.subject}-${row.concept}`}
                className="group overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/20"
              >
                <summary className="cursor-pointer px-6 py-5 outline-none transition hover:bg-slate-900/95 focus:bg-slate-900/95 sm:px-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${subjectColor}`}>{row.subject}</span>
                        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-400">{mastery}</span>
                      </div>
                      <h2 className="text-xl font-semibold text-white">{row.concept}</h2>
                    </div>
                    <div className="flex min-w-[180px] flex-col gap-3 text-right">
                      <div className="text-sm text-slate-400">Last updated</div>
                      <div className="text-sm font-medium text-slate-200">{formatDate(row.last_updated)}</div>
                    </div>
                  </div>
                </summary>

                <div className="border-t border-slate-800 px-6 py-5 sm:px-8">
                  <div className="mb-5 space-y-3">
                    <div className="flex items-center justify-between text-sm text-slate-400">
                      <span>Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-white">Strong areas</p>
                      <div className="flex flex-wrap gap-2">
                        {strongAreas.length > 0 ? (
                          strongAreas.map((item) => (
                            <span key={item} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">None listed</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-white">Weak areas</p>
                      <div className="flex flex-wrap gap-2">
                        {weakAreas.length > 0 ? (
                          weakAreas.map((item) => (
                            <span key={item} className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-200">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">None listed</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-white">Progress</p>
                      <p className="text-sm text-slate-200">{progressPercent}% complete</p>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-sky-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Quiz score</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{quizScore}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Completed topics</p>
                      <p className="mt-3 text-2xl font-semibold text-white">{completedTopics}</p>
                    </div>
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4">
                      <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Resume point</p>
                      <p className="mt-3 text-sm text-slate-200">{resumePoint}</p>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}
