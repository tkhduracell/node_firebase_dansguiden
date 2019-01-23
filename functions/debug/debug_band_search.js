
const SpotifyApi = require('../lib/spotify_api')
const secrets = require('../../.secrets.json')
const apiPromise = SpotifyApi.create(secrets.spotify)

const band = 'Lövgrens'

apiPromise.then(api => {
  api.searchArtists(band, { limit: 10, market: 'SE' })
    .then(res => res.body.artists.items)
    .then(console.debug)
})
