import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initStore } from './data/store'

const root = document.getElementById('root')!

root.innerHTML = `
  <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#334155">
    <div style="text-align:center">
      <div style="width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#1d4ed8;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div>
      <p style="font-size:14px">Loading election data…</p>
    </div>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
`

initStore().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
