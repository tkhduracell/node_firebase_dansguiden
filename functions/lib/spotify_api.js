
const SpotifyWebApi = require('spotify-web-api-node')
const SimpleOAuth2 = require('simple-oauth2')

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

function getAccessToken (spotify) {
  const oauth2 = SimpleOAuth2.create({
    client: {
      id: spotify.client_id,
      secret: spotify.client_secret
    },
    auth
  })
  return oauth2.clientCredentials.getToken({})
    .then(oauth2.accessToken.create)
}

module.exports.create = (spotify) => getAccessToken(spotify)
  .then(resp => new SpotifyWebApi({
    clientId: spotify.client_id,
    clientSecret: spotify.client_secret,
    accessToken: resp.token.access_token
  }))
