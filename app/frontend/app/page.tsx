export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-8 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Pillyway</h1>
      <p className="mt-2 text-muted-foreground">
        Plan your pilgrimage journey.
      </p>
      <a href="/caminos" className="mt-4 text-blue-500 underline">
        Explore Caminos
      </a>
    </main>
  );
}
