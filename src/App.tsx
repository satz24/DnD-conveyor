import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Login } from './components/Login'
import { Dashboard } from './components/Dashboard'
import { Library } from './components/Library'
import { ISLToText } from './components/ISLToText'
import { TextToISL } from './components/TextToISL'
import { AmbientShell } from './components/motion/AmbientShell'

type Page = 'dashboard' | 'library' | 'isl-to-text' | 'text-to-isl'

const pageEase = [0.22, 0.61, 0.36, 1] as const

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    filter: 'blur(10px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: pageEase },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: 'blur(8px)',
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
  },
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  const handleLogin = () => setIsLoggedIn(true)
  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentPage('dashboard')
  }
  const backToDashboard = () => setCurrentPage('dashboard')

  const routeKey = !isLoggedIn
    ? 'login'
    : currentPage === 'dashboard'
      ? 'dashboard'
      : currentPage

  return (
    <>
      <AmbientShell />
      <AnimatePresence mode="wait">
        <motion.div
          key={routeKey}
          className="app-motion-route"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {!isLoggedIn ? (
            <Login onLogin={handleLogin} />
          ) : currentPage === 'library' ? (
            <Library onBack={backToDashboard} />
          ) : currentPage === 'isl-to-text' ? (
            <ISLToText onBack={backToDashboard} />
          ) : currentPage === 'text-to-isl' ? (
            <TextToISL onBack={backToDashboard} />
          ) : (
            <Dashboard
              onLogout={handleLogout}
              onNavigateToLibrary={() => setCurrentPage('library')}
              onNavigateToISLToText={() => setCurrentPage('isl-to-text')}
              onNavigateToTextToISL={() => setCurrentPage('text-to-isl')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

export default App
