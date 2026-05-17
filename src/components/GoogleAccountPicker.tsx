/**
 * Google-style account chooser — shown when signing in with Google.
 * With a real OAuth Client ID, the official Google popup is used instead.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './GoogleAccountPicker.css'

export interface GoogleAccount {
  email: string
  name: string
  picture?: string
}

interface GoogleAccountPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (account: GoogleAccount) => void
  accounts: GoogleAccount[]
  onSaveAccount: (account: GoogleAccount) => void
}

const avatarColor = (email: string) => {
  const colors = ['#1a73e8', '#34a853', '#ea4335', '#fbbc04', '#9334e6', '#e37400']
  let h = 0
  for (let i = 0; i < email.length; i++) h = email.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}

const initials = (name: string, email: string) => {
  const n = name.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export function GoogleAccountPicker({
  open,
  onClose,
  onSelect,
  accounts,
  onSaveAccount,
}: GoogleAccountPickerProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')

  useEffect(() => {
    if (!open) {
      setShowAdd(false)
      setNewEmail('')
      setNewName('')
      setAddError('')
      return
    }
    if (accounts.length === 0) setShowAdd(true)
  }, [open, accounts.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email) {
      setAddError('Enter your Gmail address')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddError('Enter a valid email address')
      return
    }
    const account: GoogleAccount = {
      email,
      name: newName.trim() || email.split('@')[0],
    }
    onSaveAccount(account)
    onSelect(account)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="google-picker-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="google-picker-card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-picker-title"
          >
            <div className="google-picker-header">
              <img className="google-picker-app-logo" src="/logo.jpg" alt="" />
              <p id="google-picker-title" className="google-picker-title">
                Choose an account
              </p>
              <p className="google-picker-subtitle">to continue to LinguoSign</p>
            </div>

            {!showAdd ? (
              <>
                <ul className="google-picker-list" role="list">
                  {accounts.map((acc) => (
                    <li key={acc.email}>
                      <button
                        type="button"
                        className="google-picker-row"
                        onClick={() => onSelect(acc)}
                      >
                        {acc.picture ? (
                          <img
                            className="google-picker-avatar google-picker-avatar--img"
                            src={acc.picture}
                            alt=""
                          />
                        ) : (
                          <span
                            className="google-picker-avatar"
                            style={{ background: avatarColor(acc.email) }}
                          >
                            {initials(acc.name, acc.email)}
                          </span>
                        )}
                        <span className="google-picker-row-text">
                          <span className="google-picker-row-name">{acc.name}</span>
                          <span className="google-picker-row-email">{acc.email}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="google-picker-row google-picker-row--add"
                  onClick={() => setShowAdd(true)}
                >
                  <span className="google-picker-avatar google-picker-avatar--add">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span className="google-picker-row-text">
                    <span className="google-picker-row-name">Use another account</span>
                  </span>
                </button>
              </>
            ) : (
              <form className="google-picker-add-form" onSubmit={handleAddAccount}>
                <p className="google-picker-add-label">Sign in with your Gmail</p>
                <input
                  type="email"
                  className="google-picker-input"
                  placeholder="you@gmail.com"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setAddError('') }}
                  autoFocus
                  autoComplete="email"
                />
                <input
                  type="text"
                  className="google-picker-input"
                  placeholder="Your name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoComplete="name"
                />
                {addError && <p className="google-picker-add-error" role="alert">{addError}</p>}
                <div className="google-picker-add-actions">
                  {accounts.length > 0 && (
                    <button type="button" className="google-picker-btn google-picker-btn--ghost" onClick={() => setShowAdd(false)}>
                      Back
                    </button>
                  )}
                  <button type="submit" className="google-picker-btn google-picker-btn--primary">
                    Continue
                  </button>
                </div>
              </form>
            )}

            <p className="google-picker-footer">
              Only the account you select will be used to sign in.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
