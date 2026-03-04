import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { DataProvider } from './context/DataContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          {/* DataProvider must be inside AuthProvider so useAuth() works */}
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
