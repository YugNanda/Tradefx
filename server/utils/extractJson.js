// LLMs occasionally wrap JSON in markdown fences or add a stray sentence
// despite instructions. This strips that noise before JSON.parse.
function extractJson(rawText) {
  if (!rawText) return null
  let text = rawText.trim()

  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) text = fenceMatch[1].trim()

  // Grab the outermost {...} or [...] if there's leading/trailing chatter
  const firstBrace = Math.min(
    ...['{', '['].map((c) => (text.indexOf(c) === -1 ? Infinity : text.indexOf(c)))
  )
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))

  if (firstBrace !== Infinity && lastBrace !== -1 && lastBrace >= firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  try {
    return JSON.parse(text)
  } catch (err) {
    return null
  }
}

module.exports = { extractJson }
