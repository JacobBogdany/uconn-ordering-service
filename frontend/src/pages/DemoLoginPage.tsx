import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import type { DemoPersona } from '../types';

export default function DemoLoginPage() {
  const { loginAsPersona } = useDemo();
  const navigate = useNavigate();
  const [pendingPersona, setPendingPersona] = useState<DemoPersona | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo(persona: DemoPersona) {
    setPendingPersona(persona);
    setError(null);
    try {
      await loginAsPersona(persona);
      navigate(persona === 'operator' ? '/staff/kds' : '/locations', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start the demo session.');
    } finally {
      setPendingPersona(null);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-slate-50 px-4 py-12 sm:py-20">
      <section className="mx-auto max-w-3xl">
        <div className="mb-10 text-center text-white">
          <div className="mb-3 text-5xl" aria-hidden="true">🐾</div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">UConn Campus Dining</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Welcome to HuskyBite</h1>
          <p className="mx-auto mt-4 max-w-xl text-blue-100">
            Choose a demo role to explore the student ordering experience or the dining operator workspace.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void enterDemo('student')}
            disabled={pendingPersona !== null}
            className="group rounded-3xl border border-white/70 bg-white p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:cursor-wait disabled:opacity-70 sm:p-8"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl" aria-hidden="true">🎓</span>
            <span className="block text-xl font-bold text-blue-950">Log in as Student</span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">Browse campus menus, customize an order, and follow it to pickup.</span>
            <span className="mt-6 inline-flex rounded-full bg-blue-800 px-4 py-2 text-sm font-semibold text-white group-hover:bg-blue-900">
              {pendingPersona === 'student' ? 'Signing in…' : 'Open student view'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void enterDemo('operator')}
            disabled={pendingPersona !== null}
            className="group rounded-3xl border border-white/70 bg-white p-6 text-left shadow-xl transition hover:-translate-y-1 hover:shadow-2xl disabled:cursor-wait disabled:opacity-70 sm:p-8"
          >
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl" aria-hidden="true">🍽️</span>
            <span className="block text-xl font-bold text-blue-950">Log in as Operator</span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">Manage incoming orders and update item availability for a venue.</span>
            <span className="mt-6 inline-flex rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 group-hover:bg-amber-400">
              {pendingPersona === 'operator' ? 'Signing in…' : 'Open operator view'}
            </span>
          </button>
        </div>

        {error && (
          <div role="alert" className="mx-auto mt-6 max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error} Start the backend and confirm demo mode is enabled.
          </div>
        )}

        <p className="mt-8 text-center text-xs text-blue-100">Demo access only · No real campus payments are processed</p>
      </section>
    </main>
  );
}
