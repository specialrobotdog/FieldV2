const dns = require('dns').promises
const net = require('net')

const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

const isPrivateIpv4 = (ip) => {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true
  }
  const [a, b, c] = parts
  if (a === 10 || a === 127 || a === 0) {
    return true
  }
  if (a === 169 && b === 254) {
    return true
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }
  if (a === 192 && b === 168) {
    return true
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true
  }
  if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100)) {
    return true
  }
  if (a === 203 && b === 0 && c === 113) {
    return true
  }
  return false
}

const isPrivateIpv6 = (ip) => {
  const normalized = ip.toLowerCase()
  if (normalized === '::1' || normalized === '::') {
    return true
  }
  if (normalized.startsWith('fe80:')) {
    return true
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '')
    return isPrivateIpv4(mapped)
  }
  return false
}

const isPrivateIp = (ip) => {
  const version = net.isIP(ip)
  if (version === 4) {
    return isPrivateIpv4(ip)
  }
  if (version === 6) {
    return isPrivateIpv6(ip)
  }
  return true
}

const isBlockedHost = async (hostname) => {
  if (!hostname) {
    return true
  }
  const lower = hostname.toLowerCase()
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    return true
  }
  if (net.isIP(hostname)) {
    return isPrivateIp(hostname)
  }
  try {
    const lookups = await dns.lookup(hostname, { all: true })
    return lookups.some((entry) => isPrivateIp(entry.address))
  } catch {
    return true
  }
}

const validateUrl = async (value) => {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('INVALID_URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('INVALID_URL')
  }
  if (await isBlockedHost(parsed.hostname)) {
    throw new Error('BLOCKED_HOST')
  }
  return parsed
}

const readStreamWithLimit = async (stream) => {
  if (!stream) {
    throw new Error('NO_BODY')
  }
  const reader = stream.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.length
    if (total > MAX_BYTES) {
      throw new Error('MAX_SIZE')
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

const fetchWithRedirects = async (url, signal) => {
  let current = url
  for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
    const validated = await validateUrl(current)
    const response = await fetch(validated.toString(), {
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'FieldV1-ImageProxy',
      },
    })

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location')
      if (!location) {
        throw new Error('REDIRECT_ERROR')
      }
      current = new URL(location, validated).toString()
      continue
    }

    return response
  }

  throw new Error('TOO_MANY_REDIRECTS')
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).send('Method not allowed')
    return
  }

  const rawUrl = req.query.url
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) {
    res.status(400).send('Missing url')
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetchWithRedirects(rawUrl, controller.signal)
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().startsWith('image/')) {
      res.status(400).send('Not an image')
      return
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      res.status(413).send('Image too large')
      return
    }

    const body = await readStreamWithLimit(response.body)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Content-Length', body.length)
    res.status(200).send(body)
  } catch (error) {
    if (error && error.name === 'AbortError') {
      res.status(504).send('Timeout')
      return
    }

    if (error && error.message === 'MAX_SIZE') {
      res.status(413).send('Image too large')
      return
    }

    res.status(400).send('Unable to fetch image')
  } finally {
    clearTimeout(timeoutId)
  }
}
