import { useContext } from 'react'
import { LanguageContext } from './LanguageContextValue'

export function useT() {
  const ctx = useContext(LanguageContext)
  return ctx
}
