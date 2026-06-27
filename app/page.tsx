'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  subject?: string;
  concept?: string;
  saved?: boolean;
};

const defaultMessages: ChatMessage[] = [];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const showPlaceholder = messages.length === 0;

  const latestAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === 'assistant');
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSaveStatus('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    let detectedSubject = '';
    let detectedConcept = '';

    try {
      const detectResponse = await fetch('/api/detect-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed }),
      });
      const detectData = await detectResponse.json();
      detectedSubject = typeof detectData.subject === 'string' ? detectData.subject : '';
      detectedConcept = typeof detectData.concept === 'string' ? detectData.concept : '';
    } catch (error) {
      console.error('Detection error', error);
    }

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        text: '',
        subject: detectedSubject || undefined,
        concept: detectedConcept || undefined,
        saved: false,
      },
    ]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed, subject: detectedSubject, concept: detectedConcept }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Chat API request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let partial = '';

      while (!done) {
        const result = await reader.read();
        done = result.done ?? false;
        if (result.value) {
          partial += decoder.decode(result.value, { stream: true });
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId ? { ...message, text: message.text + decoder.decode(result.value) } : message
            )
          );
        }
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, text: message.text + decoder.decode(new Uint8Array(), { stream: false }) } : message
        )
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? { ...message, text: message.text + '\n\n[Error receiving response from chat service]' }
            : message
        )
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  async function handleSaveProgress(message: ChatMessage) {
    if (!message.subject || !message.concept) return;

    setSaveStatus('Saving...');
    const overviewGist = message.text.slice(0, 180).trim();
    const deepDiveGist = message.text
      .split(/\.(\s|$)/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 3);

    try {
      const response = await fetch('/api/save-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: message.subject,
          concept: message.concept,
          masteryLevel: 'Developing',
          overviewGist,
          deepDiveGist,
          strongAreas: [],
          weakAreas: [],
          nextSteps: [],
          notes: message.text,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save concept');
      }

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id ? { ...item, saved: true } : item
        )
      );
      setSaveStatus('Saved successfully.');
    } catch (error) {
      console.error(error);
      setSaveStatus('Save failed. Please try again.');
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex h-screen max-w-4xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-4 shadow-xl shadow-slate-950/20">
          <div className="text-lg font-semibold text-white">Study Agent</div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Link href="/" className="rounded-full px-4 py-2 transition hover:bg-slate-800 hover:text-white">Chat</Link>
            <Link href="/dashboard" className="rounded-full px-4 py-2 transition hover:bg-slate-800 hover:text-white">Dashboard</Link>
          </div>
        </nav>

        <header className="mb-6 flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/80 px-6 py-5 shadow-xl shadow-slate-950/20">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Study Agent</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Ask about concepts, save progress, and learn faster.</h1>
          </div>
          <div className="rounded-2xl bg-slate-800 px-4 py-3 text-sm text-slate-300">
            Single user chat · No auth
          </div>
        </header>

        <section className="mb-4 flex-1 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80 shadow-2xl shadow-slate-950/25">
          <div className="h-full overflow-y-auto px-5 py-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
            {showPlaceholder ? (
              <div className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
                Start by typing a study question or request. The agent will detect the subject and concept, answer it, and let you save progress.
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    {message.role === 'assistant' && (
                      <div className="max-w-[80%] rounded-3xl border border-slate-800 bg-slate-900/95 p-4 shadow-sm shadow-slate-950/40">
                        <div className="mb-2 text-xs uppercase tracking-[0.25em] text-slate-500">Assistant</div>
                        <p className="whitespace-pre-wrap text-slate-100">{message.text || '...'}</p>
                        {message.subject && message.concept && !message.saved && (
                          <button
                            onClick={() => handleSaveProgress(message)}
                            className="mt-4 inline-flex rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                          >
                            Save progress
                          </button>
                        )}
                        {message.subject && message.concept && message.saved && (
                          <div className="mt-4 text-sm text-emerald-300">Progress saved.</div>
                        )}
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="max-w-[80%] rounded-3xl bg-slate-800 px-4 py-3 text-right text-slate-100 shadow-sm shadow-slate-950/30">
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-auto rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl shadow-slate-950/20">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a study question..."
              suppressHydrationWarning
              className="flex-1 rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="inline-flex items-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {saveStatus && <p className="mt-3 text-sm text-slate-300">{saveStatus}</p>}
        </footer>
      </div>
    </main>
  );
}
