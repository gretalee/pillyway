import Link from "next/link";

export default function CaminosPage() {
  return (
    <main className="flex flex-1 flex-col px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Caminos</h1>
      <p className="mt-2 text-muted-foreground">Browse pilgrimage routes.</p>
      <Link href="/caminos/new" className="mt-4 text-blue-500 underline">
        Create New Camino
      </Link>
    </main>
  );
}
