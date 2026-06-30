import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 text-slate-100 p-6 text-center">
      {/* Premium glowing background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Decorative subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-3xl">
        {/* Brand Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 mb-6 backdrop-blur-md">
          ✨ University of Burundi Major Exchange
        </span>

        {/* Hero Title */}
        <h1 className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent mb-6">
          MajEx
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-lg text-slate-400 leading-relaxed mb-10">
          Exchange your university major with another student automatically. 
          Simply register your current and target major, and let our smart matchmaking cycle handler do the rest.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center w-full sm:w-auto">
          <Link 
            href="/auth/register" 
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 duration-200"
          >
            Create Free Account
          </Link>
          <Link 
            href="/auth/login" 
            className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-medium transition-all hover:scale-105 active:scale-95 duration-200 backdrop-blur-md"
          >
            Access Dashboard
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full text-left">
          <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-200">
              👤
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-2">1. Register Profile</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sign up securely using your university credentials and specify your active major.
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 mb-4 group-hover:scale-110 transition-transform duration-200">
              🎯
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-2">2. Set Target Major</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Define the major you wish to switch into. Our algorithm handles direct swaps and multi-way cycles.
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 backdrop-blur-md transition-all duration-300 hover:border-indigo-500/30 hover:bg-slate-900/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-400 mb-4 group-hover:scale-110 transition-transform duration-200">
              ⚡
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-2">3. Auto Match</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Matches are resolved instantly on a first-come, first-served basis once a valid cycle completes.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}