import AbstractSource from './abstract.js'

// URL de l'API Nyaa.si
const API_URL = 'https://nyaaapi.onrender.com/nyaa'

export default new class Nyaa extends AbstractSource {
  /**
   * Récupère les données de l'API Nyaa en format JSON.
   * @param {string} query
   * @returns {Promise<any[]>}
   **/
  async fetchJson (query) {
    const res = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
    const json = await res.json()
    return json.torrents
  }

  /**
   * Récupère les données d'un seul torrent par son ID.
   * @param {number} id
   * @returns {Promise<any[]>}
   **/
  async fetchById (id) {
    const res = await fetch(`${API_URL}/id/${id}`)
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`)
    const json = await res.json()
    // L'API renvoie un seul objet, nous le mettons dans un tableau pour la méthode map.
    return [json]
  }

  /**
   * Mappe les entrées de l'API en objets TorrentResult.
   * @param {any[]} entries
   * @returns {import('./index').TorrentResult[]}
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

  /** @type {import('./index').SearchFunction} */
  async single ({ titles, episode, resolution, exclusions }) {
    if (!titles?.length) throw new Error('No titles provided')
    const query = `${titles[0]} ${resolution} ${episode}`
    const json = await this.fetchJson(query)
    return this.map(json)
  }

  /** @type {import('./index').SearchFunction} */
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

  /**
   * Fonction pour rechercher un torrent par son ID.
   * @param {number} id - L'ID du torrent à rechercher.
   * @returns {Promise<import('./index').TorrentResult[]>}
   **/
  async singleById (id) {
    if (!id) throw new Error('No ID provided')
    const json = await this.fetchById(id)
    return this.map(json)
  }
}()
