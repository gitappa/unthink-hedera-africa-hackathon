import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import EventPageWrapper from './components/EventPageWrapper'
// import Card from './components/card2.tsx'
import IdPreview from './components/idPreview.tsx'
import EventEdit from './components/EventEdit'
import EventAdmin from './components/EventAdmin'
import AdminMessenger from './components/AdminMessenger'
import StatsAgent from './components/statsAgent'
import ChatAgent from './components/ChatAgent'
import ErrorBoundary from './components/ErrorBoundary'

// Messenger to notify parent on route changes
function IframeMessenger() {
  const location = useLocation()

  useEffect(() => {
    // Send the current iframe URL to parent
    window.parent.postMessage(
      { type: 'iframe-url', url: window.location.href },
      '*'
    )
  }, [location])

  useEffect(() => {
    // Prevent iframe from navigating to /event links
    const handleEventLinks = (e: MouseEvent) => {
      const target = e.target as HTMLAnchorElement
      if (target.tagName === 'A' && target.href.includes('/event')) {
        e.preventDefault() // stop navigation
        window.parent.postMessage(
          { type: 'iframe-url', url: target.href },
          '*'
        ) // notify parent to switch tab
      }
    }

    document.addEventListener('click', handleEventLinks)
    return () => document.removeEventListener('click', handleEventLinks)
  }, [])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <IframeMessenger />
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/event/:eventId" element={<EventPageWrapper />} />
          <Route path="/event/:eventId/badge" element={<IdPreview />} />
          <Route path="/event/:eventId/edit" element={<EventEdit />} />
          <Route path="/event/:eventId/stats" element={<StatsAgent />} />
          <Route path="/event/:eventId/admin" element={<EventAdmin />} />
          <Route path="/chatagent/:chatagentid" element={<ChatAgent />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)