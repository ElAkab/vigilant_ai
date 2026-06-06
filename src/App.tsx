import { Analytics } from '@vercel/analytics/react'
import { LanguageProvider } from './i18n/LanguageContext'
import { ArticlesPage } from './pages/ArticlesPage'

function App() {
  return (
    <LanguageProvider>
      <ArticlesPage />
      <Analytics />
    </LanguageProvider>
  )
}

export default App
