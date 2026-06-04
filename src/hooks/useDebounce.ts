import { useEffect, useState } from 'react'

/**
 * Retourne une valeur debounced.
 * La valeur n'est mise à jour qu'après `delay` ms d'inactivité.
 *
 * Usage typique : debounce d'un input de recherche pour éviter
 * d'appeler l'API à chaque frappe.
 *
 * @param value  La valeur brute (ex: le state de l'input)
 * @param delay  Délai en ms (défaut 300)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
