import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// Ensure root element exists and render app
const rootElement = document.getElementById('root')

if (!rootElement) {
  // Create root if it doesn't exist
  const newRoot = document.createElement('div')
  newRoot.id = 'root'
  document.body.appendChild(newRoot)
  ReactDOM.createRoot(newRoot).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

// Fallback: If React fails to render, show basic content
setTimeout(() => {
  const root = document.getElementById('root')
  if (root && root.children.length === 0) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0a0a1a; color: #fff; font-family: system-ui;">
        <div style="text-align: center; padding: 40px;">
          <img src="/logo.jpg" alt="LinguoSign" style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 32px rgba(56,189,248,0.35); margin-bottom: 18px;" />
          <h1 style="font-size: 48px; margin-bottom: 16px; background: linear-gradient(135deg, #fff, #c7d2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">LinguoSign</h1>
          <p style="font-size: 18px; opacity: 0.8;">Bridging Silence Through Signs</p>
          <p style="margin-top: 20px; font-size: 14px; opacity: 0.6;">Loading...</p>
        </div>
      </div>
    `
  }
}, 1000)
