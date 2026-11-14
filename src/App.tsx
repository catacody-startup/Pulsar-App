export function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Pulsar</h1>
      </header>
      <main className="flex-1 px-4 py-6">
        <p className="text-slate-300">Am I OK? What do I do now?</p>
      </main>
      <footer className="border-t border-slate-800 px-4 py-2 text-xs text-slate-400">
        Prototype – not for medical use.
      </footer>
    </div>
  );
}
