import { useState } from 'react'
import { StoreProvider } from './lib/store'
import Oggi from './screens/Oggi'
import Storico from './screens/Storico'
import Dieta from './screens/Dieta'
import Check from './screens/Check'
import Altro from './screens/Altro'

type Tab = 'oggi' | 'storico' | 'dieta' | 'check' | 'altro'

const ICONE: Record<Tab, JSX.Element> = {
  // bilanciere
  oggi: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="3" y1="12" x2="21" y2="12" />
      <rect className="accent" x="4" y="7" width="2.6" height="10" rx="0.8" fill="currentColor" stroke="none" />
      <rect x="7.6" y="8.8" width="2.2" height="6.4" rx="0.8" fill="currentColor" stroke="none" />
      <rect x="14.2" y="8.8" width="2.2" height="6.4" rx="0.8" fill="currentColor" stroke="none" />
      <rect className="accent" x="17.4" y="7" width="2.6" height="10" rx="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  // pila di piastre
  storico: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect className="accent" x="5" y="4" width="14" height="3.2" rx="1" />
      <rect x="6.5" y="9" width="11" height="3.2" rx="1" />
      <rect x="8" y="14" width="8" height="3.2" rx="1" />
      <rect x="9.5" y="19" width="5" height="1.8" rx="0.9" />
    </svg>
  ),
  // piatto
  dieta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <circle className="accent" cx="12" cy="12" r="3.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  // metro
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 17 L17 4 L20 7 L7 20 Z" />
      <line className="accent" x1="9" y1="15" x2="10.6" y2="16.6" />
      <line x1="12" y1="12" x2="13.6" y2="13.6" />
      <line className="accent" x1="15" y1="9" x2="16.6" y2="10.6" />
    </svg>
  ),
  altro: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.9" />
      <circle className="accent" cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  ),
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'oggi', label: 'Oggi' },
  { id: 'storico', label: 'Storico' },
  { id: 'dieta', label: 'Tavola' },
  { id: 'check', label: 'Check' },
  { id: 'altro', label: 'Sala' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('oggi')
  return (
    <StoreProvider>
      {tab === 'oggi' && <Oggi />}
      {tab === 'storico' && <Storico />}
      {tab === 'dieta' && <Dieta />}
      {tab === 'check' && <Check />}
      {tab === 'altro' && <Altro />}
      <nav className="tabbar" aria-label="navigazione">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {ICONE[t.id]}
            {t.label}
          </button>
        ))}
      </nav>
    </StoreProvider>
  )
}
