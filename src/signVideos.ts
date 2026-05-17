/** Phrase label → public URL for pre-recorded ISL sign clips. */
export const phraseVideoMap: Record<string, string> = {
  hello: '/videos/videos/Hello.mp4',
  namaste: '/videos/videos/Namaste.mp4',
  'good morning': '/videos/videos/Good%20morning.mp4',
  'good afternoon': '/videos/videos/Good%20afternoon.mp4',
  'good evening': '/videos/videos/Good%20evening.mp4',
  'good night': '/videos/videos/Good%20night.mp4',
  'how are you': '/videos/videos/how%20are%20you.mp4',
  'how are you?': '/videos/videos/how%20are%20you.mp4',
  'happy birthday': '/videos/videos/Happy%20birthday.mp4',
}

export function getPhraseVideoUrl(word: string): string | null {
  const key = word.trim().toLowerCase().replace(/[?.!]+$/, '')
  return phraseVideoMap[key] ?? phraseVideoMap[`${key}?`] ?? null
}

/** One slideshow slot: a whole word or a multi-word phrase that maps to one clip. */
export interface SignSlideMeta {
  label: string
  startWordIdx: number
  endWordIdx: number
  videoUrl: string | null
}

function normalizeToken(w: string): string {
  return w.trim().toLowerCase().replace(/[?.!,;:]+$/g, '')
}

/**
 * Split input words into slides, greedily matching longest phrases in {@link phraseVideoMap}.
 */
export function buildSignSlides(words: string[]): SignSlideMeta[] {
  const slides: SignSlideMeta[] = []
  const phraseKeys = Object.keys(phraseVideoMap).sort(
    (a, b) => b.split(/\s+/).filter(Boolean).length - a.split(/\s+/).filter(Boolean).length
  )

  let i = 0
  while (i < words.length) {
    let matched = false
    for (const phrase of phraseKeys) {
      const parts = phrase.split(/\s+/).filter(Boolean)
      if (parts.length > words.length - i) continue
      const slice = words.slice(i, i + parts.length).map(normalizeToken)
      const ok = parts.every((p, j) => normalizeToken(p) === slice[j])
      if (!ok) continue

      const label = words.slice(i, i + parts.length).join(' ')
      slides.push({
        label,
        startWordIdx: i,
        endWordIdx: i + parts.length - 1,
        videoUrl: phraseVideoMap[phrase],
      })
      i += parts.length
      matched = true
      break
    }
    if (matched) continue

    const w = words[i]
    slides.push({
      label: w,
      startWordIdx: i,
      endWordIdx: i,
      videoUrl: getPhraseVideoUrl(w),
    })
    i++
  }
  return slides
}
