import { LanguageProvider } from './i18n/LanguageContext'
import { ArticlesPage } from './pages/ArticlesPage'

function App() {
  return (
    <LanguageProvider>
      <ArticlesPage />
    </LanguageProvider>
  )
}

export default App
