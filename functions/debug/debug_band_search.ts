
import {SpotifyApiClientFactory} from '../lib/spotify_api_auth'

const band = 'Lövgrens'

async function run(): Promise<void> {
  const secrets = await require('../../.secrets.json')
  const api = await SpotifyApiClientFactory.create(secrets.spotify)

  const result = await api.searchArtists(band, { limit: 10, market: 'SE' })

  console.log(`Results for ${band}:`)
  if (result.body.artists) {
    console.debug(result.body.artists.items)
  } else {
    console.error("No results...", result.body)
  }
}

run()
