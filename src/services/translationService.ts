export type TranslateParams = {
  text: string
  targetLang: string
}

export type TranslateResult = {
  translated: string
  cached?: boolean
}

export async function translateText(
  params: TranslateParams,
): Promise<TranslateResult> {
  const { text, targetLang } = params

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ text, targetLang }),
  })

  if (!res.ok) {
    let message = `Erreur réseau (${res.status})`
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message?.trim() || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const body = (await res.json()) as { translated?: string; cached?: boolean }
  if (!body.translated) throw new Error('Réponse de traduction invalide')
  return { translated: body.translated, cached: body.cached }
}
