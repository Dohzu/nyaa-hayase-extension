import AbstractSource from './abstract.js'

// URL de l'API Nyaa.si
const API_URL = 'https://nyaaapi.onrender.com/nyaa'

export default new class Nyaa extends AbstractSource {
  /**
   * @param {string} query
   * @returns {Promise<Document>}
   **/
  async fetchJson (query) {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
    const json = await res.json()
    return json.torrents
  }

  /**
   * @param {any[]} entries
   * @returns {import('./').TorrentResult[]}
   **/
  map (entries) {
    return entries.map(item => {
      // Les données de l'API JSON sont différentes du RSS.
      // Nous utilisons les champs fournis par l'API.
      const title = item.title || ''
      const link = item.magnet || ''
      const hash = item.torrentId || ''
      const size = item.size || '0'
      
      const sizeBytes = this.parseSize(size)

      return {
        title,
        link,
        hash,
        size: sizeBytes,
        date: new Date(),
        seeders: item.seeders || 0,
        leechers: item.leechers || 0,
        downloads: item.downloads || 0,
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
    const json = await this.fetchJson(query)
    return this.map(json)
  }

  /** @type {import('./').SearchFunction} */
  async batch ({ titles, resolution, exclusions }) {
    if (!titles?.length) throw new Error('No titles provided')
    const query = `${titles[0]} ${resolution} [Batch]`
    const json = await this.fetchJson(query)
    return this.map(json)
  }

  movie = this.single

  async test () {
    const res = await fetch(API_URL + '?q=test')
    return res.ok
  }
}()
