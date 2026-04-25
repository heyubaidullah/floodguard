import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Activity, CloudRain, Users, Radio, Brain, ArrowRight,
  FlaskConical, Zap, Shield, Bell, BarChart3, MapPin,
  Moon, Sun, ChevronRight, Server, KeyRound,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' } }),
}

const AGENTS = [
  { id: 'A1', label: 'Weather', icon: <CloudRain className="h-5 w-5" />, color: 'sky', desc: 'Rain probability & accumulation via Open-Meteo' },
  { id: 'A2', label: 'Drain', icon: <MapPin className="h-5 w-5" />, color: 'amber', desc: 'Drain blockage & field incident reports' },
  { id: 'A3', label: 'Social', icon: <Radio className="h-5 w-5" />, color: 'violet', desc: 'Real-time social sentiment flagging' },
  { id: 'A4', label: 'Risk Fusion', icon: <BarChart3 className="h-5 w-5" />, color: 'emerald', desc: 'Gemini AI combines all signals into a risk score' },
  { id: 'A6', label: 'Alerts', icon: <Bell className="h-5 w-5" />, color: 'rose', desc: 'Targeted ops & public alert generation' },
]

const AGENT_COLORS: Record<string, string> = {
  sky:     'bg-sky-100     text-sky-700     border-sky-200     dark:bg-sky-500/10     dark:text-sky-300     dark:border-sky-500/30',
  amber:   'bg-amber-100   text-amber-700   border-amber-200   dark:bg-amber-500/10   dark:text-amber-300   dark:border-amber-500/30',
  violet:  'bg-violet-100  text-violet-700  border-violet-200  dark:bg-violet-500/10  dark:text-violet-300  dark:border-violet-500/30',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  rose:    'bg-rose-100    text-rose-700    border-rose-200    dark:bg-rose-500/10    dark:text-rose-300    dark:border-rose-500/30',
}

const DATA_SOURCES = [
  {
    icon: <CloudRain className="h-6 w-6 text-sky-500" />,
    title: 'Open-Meteo Weather',
    desc: 'High-resolution hourly forecasts including rainfall probability and accumulation. No API key required — freely available under CC BY 4.0.',
    badge: 'Free & Open',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  {
    icon: <Users className="h-6 w-6 text-amber-500" />,
    title: 'Citizen Reports',
    desc: 'Field incident submissions from residents and agency staff — blocked drains, standing water, and infrastructure failures.',
    badge: 'Community',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  {
    icon: <Radio className="h-6 w-6 text-violet-500" />,
    title: 'Social Signals',
    desc: 'Real-time monitoring of social posts for flood-related language. AI-powered risk flag scoring to surface urgent community reports.',
    badge: 'AI-scored',
    badgeClass: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  },
  {
    icon: <Brain className="h-6 w-6 text-emerald-500" />,
    title: 'Google Gemini AI',
    desc: 'Gemini 2.5 Flash fuses multi-source signals into a 0–1 flood risk score and generates structured alerts for operations teams.',
    badge: 'Gemini 2.5',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
]

const RISK_TIERS = [
  {
    tier: 'SAFE',
    score: '0 – 39%',
    chipClass: 'bg-emerald-500',
    borderClass: 'border-emerald-200 dark:border-emerald-500/30',
    bgClass: 'bg-emerald-50 dark:bg-emerald-500/5',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    desc: 'No elevated flood conditions. Drainage is nominal. Residents can move freely — stay alert to changing forecasts.',
  },
  {
    tier: 'MEDIUM',
    score: '40 – 69%',
    chipClass: 'bg-amber-500',
    borderClass: 'border-amber-200 dark:border-amber-500/30',
    bgClass: 'bg-amber-50 dark:bg-amber-500/5',
    textClass: 'text-amber-700 dark:text-amber-300',
    desc: 'Elevated risk from moderate rainfall or early incident reports. Avoid low-lying roads. Ops teams should stage equipment.',
  },
  {
    tier: 'HIGH',
    score: '70 – 100%',
    chipClass: 'bg-rose-500',
    borderClass: 'border-rose-200 dark:border-rose-500/30',
    bgClass: 'bg-rose-50 dark:bg-rose-500/5',
    textClass: 'text-rose-700 dark:text-rose-300',
    desc: 'Significant flood conditions confirmed. Do not drive through water. Follow authorities\' instructions. Call 911 for emergencies.',
  },
]

export default function AboutPage() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'

  return (
    <div className={`min-h-screen flex flex-col ${dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur ${dark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'}`}>
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            <span className={`text-base font-semibold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>FloodGuard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className={`text-xs transition ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Public View
            </Link>
            <span className={`text-xs ${dark ? 'text-slate-700' : 'text-slate-300'}`}>·</span>
            <Link
              to="/admin"
              className={`text-xs transition ${dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Agency Login →
            </Link>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`ml-2 inline-flex items-center rounded-full border px-3 py-2 text-xs font-medium transition min-h-[36px] ${dark ? 'border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'}`}
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── 1. Hero ── */}
        <section className={`py-20 sm:py-28 text-center px-4 border-b ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <motion.div
            className="mx-auto max-w-2xl"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div variants={fadeUp} className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-6">
              <Activity className="h-8 w-8 text-white" />
            </motion.div>
            <motion.h1 variants={fadeUp} className={`text-4xl sm:text-5xl font-bold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              FloodGuard
            </motion.h1>
            <motion.p variants={fadeUp} className={`mt-2 text-lg font-medium ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              AI-powered flood risk monitoring for communities
            </motion.p>
            <motion.p variants={fadeUp} className={`mt-5 text-base leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
              FloodGuard combines real-time weather data, citizen field reports, and social media signals
              into a unified risk dashboard — powered by a multi-agent AI pipeline built on Google Gemini.
              Built for emergency responders, city ops teams, and the public.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800"
              >
                <FlaskConical className="h-4 w-4" />
                Try Demo
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold transition ${dark ? 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
              >
                View Source
                <ChevronRight className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ── 2. How It Works — Agent Pipeline ── */}
        <section className={`py-16 sm:py-20 px-4 ${dark ? 'bg-slate-900/50' : 'bg-white'}`}>
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp} className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                How It Works
              </motion.p>
              <motion.h2 variants={fadeUp} className={`text-2xl sm:text-3xl font-bold mb-4 ${dark ? 'text-white' : 'text-slate-900'}`}>
                Multi-agent AI pipeline
              </motion.h2>
              <motion.p variants={fadeUp} className={`text-sm leading-relaxed max-w-xl mb-10 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                An orchestrator (A0) dispatches five specialist agents in parallel. Each agent
                queries its data source and reports back structured results — then Gemini fuses
                them into a single risk score and generates actionable alerts.
              </motion.p>

              {/* Pipeline diagram — horizontal on desktop, vertical on mobile */}
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0 overflow-x-auto pb-2">
                {AGENTS.map((agent, i) => (
                  <div key={agent.id} className="flex flex-col sm:flex-row items-center flex-shrink-0">
                    <motion.div
                      custom={i}
                      variants={fadeUp}
                      className={`flex flex-col items-center rounded-2xl border p-4 sm:p-5 w-40 sm:w-36 text-center ${AGENT_COLORS[agent.color]}`}
                    >
                      <div className="mb-2">{agent.icon}</div>
                      <div className="text-xs font-bold mb-0.5">{agent.id}</div>
                      <div className="text-xs font-semibold mb-1">{agent.label}</div>
                      <div className="text-xs opacity-75 leading-snug hidden sm:block">{agent.desc}</div>
                    </motion.div>
                    {i < AGENTS.length - 1 && (
                      <div className={`flex items-center justify-center ${dark ? 'text-slate-600' : 'text-slate-300'}`}>
                        <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0 mx-1 sm:mx-2 shrink-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Agent descriptions on mobile */}
              <div className="mt-6 sm:hidden space-y-2">
                {AGENTS.map(agent => (
                  <div key={agent.id} className={`flex items-start gap-3 rounded-xl border p-3 text-xs ${AGENT_COLORS[agent.color]}`}>
                    <div className="mt-0.5 shrink-0">{agent.icon}</div>
                    <div>
                      <span className="font-bold">{agent.id} · {agent.label}: </span>
                      <span className="opacity-80">{agent.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 3. Data Sources ── */}
        <section className={`py-16 sm:py-20 px-4 border-y ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp} className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Data Sources
              </motion.p>
              <motion.h2 variants={fadeUp} className={`text-2xl sm:text-3xl font-bold mb-10 ${dark ? 'text-white' : 'text-slate-900'}`}>
                What powers the risk model
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DATA_SOURCES.map((src, i) => (
                  <motion.div
                    key={src.title}
                    custom={i}
                    variants={fadeUp}
                    className={`rounded-2xl border p-5 ${dark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>{src.icon}</div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${src.badgeClass}`}>{src.badge}</span>
                    </div>
                    <h3 className={`text-sm font-semibold mb-1.5 ${dark ? 'text-slate-100' : 'text-slate-800'}`}>{src.title}</h3>
                    <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{src.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 4. Risk Tiers ── */}
        <section className={`py-16 sm:py-20 px-4 ${dark ? 'bg-slate-900/50' : 'bg-white'}`}>
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp} className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Risk Tiers
              </motion.p>
              <motion.h2 variants={fadeUp} className={`text-2xl sm:text-3xl font-bold mb-10 ${dark ? 'text-white' : 'text-slate-900'}`}>
                What the levels mean
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {RISK_TIERS.map((rt, i) => (
                  <motion.div
                    key={rt.tier}
                    custom={i}
                    variants={fadeUp}
                    className={`rounded-2xl border p-5 ${rt.borderClass} ${rt.bgClass}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${rt.chipClass}`} />
                      <span className={`text-base font-bold ${rt.textClass}`}>{rt.tier}</span>
                      <span className={`ml-auto text-xs font-semibold tabular-nums ${rt.textClass} opacity-70`}>{rt.score}</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{rt.desc}</p>
                  </motion.div>
                ))}
              </div>
              <motion.p variants={fadeUp} className={`mt-5 text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Score ranges are derived from the Risk Fusion agent combining precipitation probability, accumulation, incident density, and social signal sentiment.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* ── 5. Get Started ── */}
        <section className={`py-16 sm:py-20 px-4 border-t ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            >
              <motion.p variants={fadeUp} className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Get Started
              </motion.p>
              <motion.h2 variants={fadeUp} className={`text-2xl sm:text-3xl font-bold mb-10 ${dark ? 'text-white' : 'text-slate-900'}`}>
                Two ways to explore
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Demo Mode */}
                <motion.div variants={fadeUp} className={`rounded-2xl border p-6 ${dark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <FlaskConical className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${dark ? 'text-emerald-300' : 'text-emerald-800'}`}>Demo Mode</h3>
                      <p className={`text-xs ${dark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>No API key needed</p>
                    </div>
                  </div>
                  <ul className={`space-y-2 text-xs mb-5 ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">✓</span> Pre-loaded Miami flood scenario</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">✓</span> Three risk zones: HIGH, MEDIUM, SAFE</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">✓</span> Synthetic A2A agent timeline visible</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5 shrink-0">✓</span> All dashboard panels populate instantly</li>
                  </ul>
                  <Link
                    to="/admin"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 active:bg-emerald-800"
                  >
                    <FlaskConical className="h-4 w-4" />
                    Try Demo Now
                  </Link>
                </motion.div>

                {/* Self-Host */}
                <motion.div variants={fadeUp} className={`rounded-2xl border p-6 ${dark ? 'border-slate-700 bg-slate-900/60' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <Server className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${dark ? 'text-slate-200' : 'text-slate-800'}`}>Self-Host</h3>
                      <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>Full AI agents, live data</p>
                    </div>
                  </div>
                  <ul className={`space-y-2 text-xs mb-5 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <li className="flex items-start gap-2">
                      <KeyRound className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                      <span>Set <code className={`rounded px-1 text-xs ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>GEMINI_API_KEY</code> environment variable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-500" />
                      <span>Node.js 20+ and a PostgreSQL database</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      <span>Runs <code className={`rounded px-1 text-xs ${dark ? 'bg-slate-800' : 'bg-slate-100'}`}>npm run dev</code> — backend on :3000, frontend on :5000</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Brain className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-500" />
                      <span>Or enter your Gemini key in-browser via the BYOK field — no server config needed</span>
                    </li>
                  </ul>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${dark ? 'border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white' : 'border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900'}`}
                  >
                    View on GitHub
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </motion.div>

              </div>
            </motion.div>
          </div>
        </section>

      </main>

      {/* ── 6. Footer ── */}
      <footer className={`border-t py-8 px-4 text-center ${dark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="mx-auto max-w-5xl space-y-1.5">
          <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            FloodGuard was awarded 🏆 Best Overall // 1st Prize Winner at ShellHacks 2025
          </p>
          <p className={`text-xs ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
            Made with love &amp; care, by Ubaid &amp; Christina at{' '}
            <a
              href="https://www.dynelabs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Dyne Labs
            </a>{' '}
            © 2025
          </p>
          <div className="pt-1 flex items-center justify-center gap-4 text-xs">
            <Link to="/" className={`transition hover:underline ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>Home</Link>
            <Link to="/admin" className={`transition hover:underline ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>Agency Login</Link>
            <Link to="/about" className={`transition hover:underline ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>About</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
