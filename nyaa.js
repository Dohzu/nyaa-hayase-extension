import AbstractSource from '../abstract.js'

const QUALITIES = ['1080', '720', '540', '480']

function extractHash(magnet) {
  const m = magnet.match(/xt=urn:btih:([0-9A-Fa-f]{40}|[0-9A-Za-z]{32})/)
  return m ? m[1].toLowerCase() : undefined
}

function parseSize(text) {
  if (!text) return undefined
  const m = text.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB)/i)
  if (!m) return undefined
  const n = parseFloat(m[1])
  switch (m[2].toLowerCase()) {
    case 'kib': return n * 1024
    case 'mib': return n * 1024 ** 2
    case 'gib': return n * 1024 ** 3
    case 'tib': return n * 1024 ** 4
    default: return undefined
  }
}

export default new class Nyaa extends AbstractSource {
  url = atob('aHR0cHM6Ly9ueWFhLnNpL3Jzcw==') // https://nyaa.si/rss

  buildQuery({ resolution, exclusions, mode }) {
    // mode = "dub" | "sub" | undefined
    let base = ''
    if (mode === 'dub') base += '(dub OR dubbed OR dual) '
    if (mode === 'sub') base += '(sub OR subs OR subtitle) '
    if (resolution) base += resolution + ' '
    if (exclusions?.length) {
      base += exclusions.map(e => `-${e}`).join(' ')
    }
    return base.trim()
  }

  /**
   * @param {Document} xml
   * @param {boolean} batch
   * @returns {import('../').TorrentResult[]}
   */
  map(xml, batch = false) {
    const items = Array.from(xml.querySelectorAll('item'))
    return items.map(item => {
      const title = item.querySelector('title')?.textContent || ''
      const link = item.querySelector('link')?.textContent || ''
      const magnet = Array.from(item.querySelectorAll('link'))
        .map(l => l.textContent)
        .find(l => l && l.startsWith('magnet:')) || link

      const pubDate = item.querySelector('pubDate')?.textContent || ''
      const date = pubDate ? new Date(pubDate) : undefined
      const desc = item.querySelector('description')?.textContent || ''

      const size = parseSize(desc)
      const seedMatch = desc.match(/Seeders:\s*(\d+)/i)
      const leechMatch = desc.match(/Leechers:\s*(\d+)/i)
      const downloadMatch = desc.match(/Downloads:\s*(\d+)/i)

      return {
        title,
        link: magnet,
        seeders: (seedMatch ? parseInt(seedMatch[1]) : 0),
        leechers: (leechMatch ? parseInt(leechMatch[1]) : 0),
        downloads: (downloadMatch ? parseInt(downloadMatch[1]) : 0),
        hash: extractHash(magnet),
        size,
        accuracy: title.toLowerCase().includes('batch') ? 'high' : 'medium',
        type: batch ? 'batch' : (title.toLowerCase().includes('batch') ? 'batch' : undefined),
        date
      }
    }).sort((a, b) => (b.seeders || 0) - (a.seeders || 0))
  }

  async fetchAndParse(q) {
    const res = await fetch(this.url + '?q=' + encodeURIComponent(q))
    const text = await res.text()
    const parser = new DOMParser()
    return parser.parseFromString(text, 'application/xml')
  }

  /** @type {import('../').SearchFunction} */
  async single({ anidbEid, resolution, exclusions, mode }) {
    if (!anidbEid) throw new Error('No anidbEid provided')
    const q = anidbEid + ' ' + this.buildQuery({ resolution, exclusions, mode })
    const xml = await this.fetchAndParse(q)
    return this.map(xml)
  }

  /** @type {import('../').SearchFunction} */
  async batch({ anidbAid, resolution, exclusions, mode }) {
    if (!anidbAid) throw new Error('No anidbAid provided')
    const q = anidbAid + ' ' + this.buildQuery({ resolution, exclusions, mode })
    const xml = await this.fetchAndParse(q)
    return this.map(xml, true)
  }

  /** @type {import('../').SearchFunction} */
  async movie({ anidbAid, resolution, exclusions, mode }) {
    if (!anidbAid) throw new Error('No anidbAid provided')
    const q = anidbAid + ' ' + this.buildQuery({ resolution, exclusions, mode })
    const xml = await this.fetchAndParse(q)
    return this.map(xml)
  }

  async test() {
    const res = await fetch(this.url)
    return res.ok
  }
}()
