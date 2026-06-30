import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">MajEx</h1>
      <p className="max-w-md text-slate-600">
        Exchange your major with another University of Burundi student.
        Register, set your current and target major, and we'll match you
        automatically — first come, first served.
      </p>
      <div className="flex gap-4">
        <Link href="/auth/register" className="rounded-lg bg-slate-900 px-5 py-2 text-white">
          Register
        </Link>
        <Link href="/auth/login" className="rounded-lg border border-slate-300 px-5 py-2">
          Log in
        </Link>
      </div>
    </main>
  )
}