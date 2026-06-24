import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { MarketProvider } from './context/MarketContext'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-page)' }}>
      <div style={{ width:28,height:28,border:'2px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spinRing 0.7s linear infinite' }} />
    </div>
  )
  return user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MarketProvider>
          <BrowserRouter>
            <AppRoutes />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'var(--bg-card)',
                  color: 'var(--text-1)',
                  border: '1px solid var(--border)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '13px',
                  boxShadow: 'var(--shadow-md)',
                },
                success: { iconTheme: { primary: '#059669', secondary: 'white' } },
                error:   { iconTheme: { primary: '#DC2626', secondary: 'white' } },
              }}
            />
          </BrowserRouter>
        </MarketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
