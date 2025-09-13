import AbstractSource from './abstract.js'

// Proxy URL to bypass CORS restrictions
const PROXY_URL = 'https://cors-anywhere.herokuapp.com/' 

const NYAA_URL = atob('aHR0cHM6Ly9ueWFhLnNpLz9wYWdlPXJzcw==')

export default new class Nyaa extends AbstractSource {
  /**
   * @param {string} query
   * @returns {Promise<Document>}
   **/
  async fetchRss (query) {
    // The request now goes through the proxy
    const res = await fetch(`${PROXY_URL}${NYAA_URL}&q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
    const text = await res.text()
    const parser = new DOMParser()
    return parser.parseFromString(text, 'text/xml')
  }

  /**
   * @param {Document} xmlDoc
   * @returns {import('./').TorrentResult[]}
   **/
  map (xmlDoc) {
    const items = Array.from(xmlDoc.querySelectorAll('item'))
    return items.map(item => {
      const title = item.querySelector('title')?.textContent || ''
      const link = item.querySelector('link')?.textContent || ''
      const description = item.querySelector('description')?.textContent || ''
      const sizeMatch = description.match(/Size: ([\d.]+ (B|KB|MB|GB|TB))/)
      const sizeBytes = sizeMatch ? this.parseSize(sizeMatch[1]) : 0
      const pubDate = item.querySelector('pubDate')?.textContent || ''
      const hashMatch = link.match(/btih:([a-fA-F0-9]{40})/)
      const hash = hashMatch ? hashMatch[1] : ''

      return {
        title,
        link,
        hash,
        size: sizeBytes,
        date: new Date(pubDate),
        seeders: 0, 
        leechers: 0,
        downloads: 0,
        accuracy: 'low'
      }
    })
  }

  parseSize (sizeStr) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const [value, unit] = sizeStr.split(' ')
    const unitIndex = units.indexOf(unit)
    return parseFloat(value) * (1024 ** unitIndex)
  }

  /** @type {import('./').SearchFunction} */
  async single ({ titles, episode, resolution, exclusions }) {
    if (!titles?.length) throw new Error('No titles provided')
    const query = `${titles[0]} ${resolution} ${episode}`
    const xmlDoc = await this.fetchRss(query)
    return this.map(xmlDoc)
  }

  /** @type {import('./').SearchFunction} */
  async batch ({ titles, resolution, exclusions }) {
    if (!titles?.length) throw new Error('No titles provided')
    const query = `${titles[0]} ${resolution} [Batch]`
    const xmlDoc = await this.fetchRss(query)
    return this.map(xmlDoc)
  }
  
  movie = this.single

  async test () {
    const res = await fetch(this.url)
    return res.ok
  }
}()
