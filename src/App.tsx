import { useState } from 'react'
import { Login }     from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Library }   from './components/Library'
import { ISLToText } from './components/ISLToText'
import { TextToISL } from './components/TextToISL'

type Page = 'dashboard' | 'library' | 'isl-to-text' | 'text-to-isl'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const handleLogin     = () => setIsLoggedIn(true)
  const handleLogout    = () => { setIsLoggedIn(false); setCurrentPage('dashboard') }
  const backToDashboard = () => setCurrentPage('dashboard')

  if (!isLoggedIn) return <Login onLogin={handleLogin} />

  if (currentPage === 'library')     return <Library   onBack={backToDashboard} />
  if (currentPage === 'isl-to-text') return <ISLToText onBack={backToDashboard} />
  if (currentPage === 'text-to-isl') return <TextToISL onBack={backToDashboard} />

  return (
    <Dashboard
      onLogout={handleLogout}
      onNavigateToLibrary={()    => setCurrentPage('library')}
      onNavigateToISLToText={() => setCurrentPage('isl-to-text')}
      onNavigateToTextToISL={() => setCurrentPage('text-to-isl')}
    />
  )
}

export default App
