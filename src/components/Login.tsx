/**
 * Login — Framer Motion enhanced
 * All auth logic preserved; motion layer added on top.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { GoogleAccountPicker, type GoogleAccount } from './GoogleAccountPicker'
import { publicAsset } from '../publicAsset'
import './Login.css'

const GOOGLE_ACCOUNTS_KEY = 'linguosing_google_accounts'

interface LoginProps {
  onLogin?: () => void
}

// ─── Shared easing (matches CSS --ls-ease-soft) ───────────────────
const ease = [0.22, 0.61, 0.36, 1] as const

// ─── Variants ────────────────────────────────────────────────────
const heroVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } }
}

const cardVariants = {
  hidden:  { opacity: 0, y: 32, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.5, delay: 0.08, ease } }
}

const formFieldVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.35, ease } }
}

const formContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.28 } }
}

const errorVariants: Variants = {
  hidden:  { opacity: 0, y: -8,  scale: 0.96 },
  visible: { opacity: 1, y: 0,   scale: 1,    transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6,  scale: 0.96, transition: { duration: 0.15 } }
}

// ─── Icon components ──────────────────────────────────────────────

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const IconAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IconSpinner = () => (
  <svg className="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
)

export const Login = ({ onLogin }: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string>('')
  const [isLoading, setIsLoading]       = useState(false)
  const [rememberMe, setRememberMe]     = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [formData, setFormData]         = useState({ name: '', email: '', password: '' })
  const [showGooglePicker, setShowGooglePicker] = useState(false)
  const [googleAccounts, setGoogleAccounts]     = useState<GoogleAccount[]>([])

  // ── Initialize localStorage credentials ──────────────────────────
  useEffect(() => {
    const storedCredentials = localStorage.getItem('dndconveyor_credentials')
    if (!storedCredentials) {
      localStorage.setItem('dndconveyor_credentials', JSON.stringify({
        email: 'dndconveyor@gmail.com',
        password: 'dndconveyor26'
      }))
    }

    const rememberedData = localStorage.getItem('dndconveyor_remembered')
    if (rememberedData) {
      try {
        const remembered = JSON.parse(rememberedData)
        if (remembered.email) {
          setFormData(prev => ({ ...prev, email: remembered.email, password: remembered.password || '' }))
          setRememberMe(true)
        }
      } catch (err) {
        console.warn('Error loading remembered data:', err)
      }
    }

    const savedGoogle = localStorage.getItem(GOOGLE_ACCOUNTS_KEY)
    if (savedGoogle) {
      try {
        const parsed = JSON.parse(savedGoogle) as GoogleAccount[]
        if (Array.isArray(parsed)) setGoogleAccounts(parsed)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const persistGoogleAccount = useCallback((account: GoogleAccount) => {
    setGoogleAccounts(prev => {
      const next = [account, ...prev.filter(a => a.email !== account.email)]
      localStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const finishGoogleLogin = useCallback((account: GoogleAccount) => {
    persistGoogleAccount(account)
    localStorage.setItem('dndconveyor_user', JSON.stringify({
      name: account.name,
      email: account.email,
      picture: account.picture ?? '',
      provider: 'google',
      loggedIn: true,
      loginTime: new Date().toISOString(),
    }))
    setShowGooglePicker(false)
    setIsLoading(false)
    if (onLogin) onLogin()
  }, [onLogin, persistGoogleAccount])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    if (name === 'email') {
      const rememberedData = localStorage.getItem('dndconveyor_remembered')
      if (rememberedData) {
        try {
          const remembered = JSON.parse(rememberedData)
          if (value.trim().toLowerCase() === remembered.email?.toLowerCase()) {
            setFormData(prev => ({ ...prev, password: remembered.password || '' }))
          } else {
            setFormData(prev => ({ ...prev, password: '' }))
          }
        } catch (err) {
          console.warn('Error checking remembered data:', err)
        }
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const storedCredentials = localStorage.getItem('dndconveyor_credentials')
    if (!storedCredentials) { setError('Database error: Credentials not found'); return }

    const credentials   = JSON.parse(storedCredentials)
    const enteredEmail  = formData.email.trim().toLowerCase()
    const validEmail    = credentials.email.toLowerCase()

    if (enteredEmail !== validEmail)          { setError('Invalid email address'); return }
    if (formData.password !== credentials.password) { setError('Invalid password');       return }

    localStorage.setItem('dndconveyor_user', JSON.stringify({
      name: formData.name, email: formData.email, loggedIn: true,
      loginTime: new Date().toISOString()
    }))

    if (rememberMe) {
      localStorage.setItem('dndconveyor_remembered', JSON.stringify({
        email: formData.email.trim(), password: formData.password
      }))
    } else {
      localStorage.removeItem('dndconveyor_remembered')
    }

    setIsLoading(true)
    setTimeout(() => { setIsLoading(false); if (onLogin) onLogin() }, 700)
  }

  const togglePasswordVisibility = () => setShowPassword(prev => !prev)

  // Dynamically load Google Identity Services script (only once).
  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const w = window as unknown as { google?: { accounts?: { oauth2?: unknown } } }
      if (w.google?.accounts?.oauth2) { resolve(); return }
      const existing = document.getElementById('gsi-script') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), { once: true })
        return
      }
      const script = document.createElement('script')
      script.id = 'gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  const handleGoogleLogin = async () => {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()
    if (!clientId) {
      setError('')
      setShowGooglePicker(true)
      return
    }

    setError('')
    setIsLoading(true)
    try {
      await loadGoogleScript()
      const google = (window as unknown as {
        google: {
          accounts: {
            oauth2: {
              initTokenClient: (config: {
                client_id: string
                scope: string
                prompt?: string
                callback: (resp: { access_token?: string; error?: string }) => void
                error_callback?: (err: unknown) => void
              }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
            }
          }
        }
      }).google

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        // Force the Google account-chooser popup every time so the user can
        // pick which Gmail account to sign in with.
        prompt: 'select_account',
        callback: async (resp) => {
          if (resp.error || !resp.access_token) {
            setIsLoading(false)
            setError('Google sign-in was cancelled. Please try again.')
            return
          }
          try {
            const userRes = await fetch(
              'https://www.googleapis.com/oauth2/v3/userinfo',
              { headers: { Authorization: `Bearer ${resp.access_token}` } }
            )
            if (!userRes.ok) throw new Error('Failed to fetch user info')
            const profile = await userRes.json() as {
              email?: string; name?: string; picture?: string; sub?: string
            }
            const account: GoogleAccount = {
              name: profile.name ?? 'Google User',
              email: profile.email ?? '',
              picture: profile.picture,
            }
            finishGoogleLogin(account)
          } catch (err) {
            console.error(err)
            setIsLoading(false)
            setError('Could not load your Google profile. Please try again.')
          }
        },
        error_callback: (err: unknown) => {
          console.error('Google sign-in error:', err)
          setIsLoading(false)
          setError('Google sign-in popup was closed or blocked.')
        },
      })
      tokenClient.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      console.error('Google sign-in script error:', err)
      setIsLoading(false)
      setError('Could not load Google sign-in. Check your internet connection.')
    }
  }

  return (
    <div className="login-container">
      {/* Animated background orbs */}
      <div className="login-orb login-orb-1" aria-hidden="true" />
      <div className="login-orb login-orb-2" aria-hidden="true" />
      <div className="login-orb login-orb-3" aria-hidden="true" />

      {/* ── Floating decorative shapes ─────────────────────────────── */}

      {/* Triangles */}
      <svg className="ls-float ls-tri-1" viewBox="0 0 64 56" fill="none" aria-hidden="true">
        <polygon points="32,3 61,53 3,53" stroke="#00e5ff" strokeWidth="1.5" fill="rgba(0,229,255,0.06)" strokeLinejoin="round"/>
      </svg>
      <svg className="ls-float ls-tri-2" viewBox="0 0 52 46" fill="none" aria-hidden="true">
        <polygon points="26,3 49,43 3,43" stroke="#bf5fff" strokeWidth="1.5" fill="rgba(191,95,255,0.07)" strokeLinejoin="round"/>
      </svg>
      <svg className="ls-float ls-tri-3" viewBox="0 0 38 34" fill="none" aria-hidden="true">
        <polygon points="19,2 36,32 2,32" stroke="#00e5ff" strokeWidth="1" fill="rgba(0,229,255,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="ls-float ls-tri-4" viewBox="0 0 44 38" fill="none" aria-hidden="true">
        <polygon points="22,3 42,35 2,35" stroke="#ff2cf5" strokeWidth="1.5" fill="rgba(255,44,245,0.05)" strokeLinejoin="round"/>
      </svg>

      {/* Dashed rings */}
      <svg className="ls-float ls-ring-1" viewBox="0 0 70 70" fill="none" aria-hidden="true">
        <circle cx="35" cy="35" r="32" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="9 6"/>
      </svg>
      <svg className="ls-float ls-ring-2" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="24" cy="24" r="21" stroke="#bf5fff" strokeWidth="1" strokeDasharray="6 5"/>
      </svg>
      <svg className="ls-float ls-ring-3" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="16" stroke="#ff2cf5" strokeWidth="1" strokeDasharray="5 4"/>
      </svg>

      {/* Open palm hand silhouette */}
      <svg className="ls-float ls-hand-1" viewBox="0 0 88 108" fill="none" aria-hidden="true">
        <path
          d="M44 100 C26 100 14 86 14 70 L14 36 C14 31.6 17.6 28 22 28 C26.4 28 30 31.6 30 36 L30 58
             M30 34 L30 22 C30 17.6 33.6 14 38 14 C42.4 14 46 17.6 46 22 L46 56
             M46 20 L46 16 C46 11.6 49.6 8 54 8 C58.4 8 62 11.6 62 16 L62 56
             M62 22 L62 18 C62 13.6 65.6 10 70 10 C74.4 10 78 13.6 78 18 L78 58
             C82 54 84 50 84 46 C84 42 87 39 90 41 C93 43 94 47.5 91.5 52
             C85 66 70 82 50 88"
          stroke="#00e5ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>

      {/* Victory / peace-sign hand */}
      <svg className="ls-float ls-hand-2" viewBox="0 0 72 96" fill="none" aria-hidden="true">
        <path
          d="M36 88 C20 88 10 75 10 62 L10 44 C10 39.6 13.6 36 18 36 C22.4 36 26 39.6 26 44 L26 62
             M26 40 L26 18 C26 13.6 29.6 10 34 10 C38.4 10 42 13.6 42 18 L42 60
             M42 18 L42 14 C42 9.6 45.6 6 50 6 C54.4 6 58 9.6 58 14 L58 52
             C62 48 64 44 63 40 C62.4 37 65 34 68 36 C71 38 72 42 69 46
             L56 62 L56 68 C56 78 47 88 36 88 Z"
          stroke="#bf5fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>

      {/* Index-finger pointing up (ISL/ASL "1") */}
      <svg className="ls-float ls-hand-3" viewBox="0 0 56 88" fill="none" aria-hidden="true">
        <path
          d="M28 80 C16 80 8 70 8 58 L8 46 C8 41.6 11.6 38 16 38 C20.4 38 24 41.6 24 46 L24 62
             M24 40 L24 18 C24 13.6 27.6 10 32 10 C36.4 10 40 13.6 40 18 L40 60
             C44 57 46 53 46 49 C46 45.6 49 43 52 44.5 C55 46 56 50 54 54
             C50 64 40 74 28 80 Z
             M24 40 L24 12 C24 7.6 27.6 4 32 4 C36.4 4 40 7.6 40 12 L40 40"
          stroke="#ff2cf5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>

      {/* Small diamond */}
      <svg className="ls-float ls-diamond-1" viewBox="0 0 40 48" fill="none" aria-hidden="true">
        <polygon points="20,2 38,24 20,46 2,24" stroke="#bf5fff" strokeWidth="1.5" fill="rgba(191,95,255,0.05)" strokeLinejoin="round"/>
      </svg>
      <svg className="ls-float ls-diamond-2" viewBox="0 0 28 34" fill="none" aria-hidden="true">
        <polygon points="14,2 26,17 14,32 2,17" stroke="#00e5ff" strokeWidth="1" fill="rgba(0,229,255,0.04)" strokeLinejoin="round"/>
      </svg>

      {/* ── Branding ─────────────────────────────────────────────── */}
      <motion.div
        className="login-hero"
        variants={heroVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="login-logo-badge" aria-hidden="true">
          <img className="login-logo-badge-img" src={publicAsset('logo.jpg')} alt="LinguoSign logo" />
        </div>
        <h1 className="login-brand-name">LinguoSign</h1>
        <p className="login-brand-tagline">Assistive sign-to-text translation for everyone</p>
      </motion.div>

      {/* ── Card ─────────────────────────────────────────────────── */}
      <motion.div
        className="login-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="login-header">
          <h2 className="login-title">Welcome back</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>
        </div>

        <motion.form
          className="login-form"
          onSubmit={handleSubmit}
          noValidate
          variants={formContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Name Field */}
          <motion.div className="form-group" variants={formFieldVariants}>
            <label htmlFor="name" className="form-label">Full Name</label>
            <div className="input-wrapper">
              <motion.span
                className="input-icon"
                animate={{ color: focusedField === 'name' ? '#38bdf8' : 'rgba(148,163,184,0.45)' }}
                transition={{ duration: 0.2 }}
              >
                <IconUser />
              </motion.span>
              <input
                type="text" id="name" name="name"
                className="form-input"
                placeholder="Your name"
                value={formData.name}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                required aria-required="true" autoComplete="name"
              />
            </div>
          </motion.div>

          {/* Email Field */}
          <motion.div className="form-group" variants={formFieldVariants}>
            <label htmlFor="email" className="form-label">Email Address</label>
            <div className="input-wrapper">
              <motion.span
                className="input-icon"
                animate={{ color: focusedField === 'email' ? '#38bdf8' : 'rgba(148,163,184,0.45)' }}
                transition={{ duration: 0.2 }}
              >
                <IconMail />
              </motion.span>
              <input
                type="email" id="email" name="email"
                className="form-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required aria-required="true" autoComplete="email"
              />
            </div>
          </motion.div>

          {/* Password Field */}
          <motion.div className="form-group" variants={formFieldVariants}>
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">Password</label>
              <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
            </div>
            <div className="input-wrapper">
              <motion.span
                className="input-icon"
                animate={{ color: focusedField === 'password' ? '#38bdf8' : 'rgba(148,163,184,0.45)' }}
                transition={{ duration: 0.2 }}
              >
                <IconLock />
              </motion.span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password" name="password"
                className="form-input password-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required aria-required="true" autoComplete="current-password"
              />
              <motion.button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </motion.button>
            </div>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="error-message-box"
                role="alert"
                variants={errorVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <IconAlert />
                <span className="error-text">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Remember Me */}
          <motion.div className="remember-me" variants={formFieldVariants}>
            <label className="remember-me-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="remember-me-checkbox"
              />
              <span className="remember-me-text">Remember me</span>
            </label>
          </motion.div>

          {/* Sign In Button */}
          <motion.div variants={formFieldVariants}>
            <motion.button
              type="submit"
              className={`signin-button${isLoading ? ' loading' : ''}`}
              disabled={isLoading}
              whileHover={isLoading ? {} : { scale: 1.015, y: -1 }}
              whileTap={isLoading ? {} : { scale: 0.975 }}
              transition={{ duration: 0.15 }}
            >
              {isLoading ? (
                <><IconSpinner /><span>Signing in…</span></>
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </motion.div>

          {/* Separator */}
          <motion.div className="separator" variants={formFieldVariants}>
            <span className="separator-line" />
            <span className="separator-text">or continue with</span>
            <span className="separator-line" />
          </motion.div>

          {/* Social Login */}
          <motion.div className="social-login" variants={formFieldVariants}>
            <motion.button
              type="button"
              className={`social-button google-button${isLoading ? ' loading' : ''}`}
              aria-label="Sign in with Google"
              whileHover={isLoading ? {} : { scale: 1.015, y: -1 }}
              whileTap={isLoading ? {} : { scale: 0.975 }}
              transition={{ duration: 0.15 }}
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <><IconSpinner /><span>Connecting…</span></>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Register Link */}
          <motion.p className="register-text" variants={formFieldVariants}>
            Don't have an account?{' '}
            <a href="#" className="register-link-text" onClick={(e) => e.preventDefault()}>
              Create one free
            </a>
          </motion.p>
        </motion.form>
      </motion.div>

      <GoogleAccountPicker
        open={showGooglePicker}
        onClose={() => setShowGooglePicker(false)}
        accounts={googleAccounts}
        onSaveAccount={persistGoogleAccount}
        onSelect={(account) => {
          setIsLoading(true)
          setTimeout(() => finishGoogleLogin(account), 400)
        }}
      />
    </div>
  )
}
