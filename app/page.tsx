export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
        Phase 0 · scaffold
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-earth">MatList</h1>
      <p className="max-w-md text-muted">
        วัสดุครบ จบที่ลิสต์เดียว — Every material. One list.
      </p>
    </main>
  );
}
