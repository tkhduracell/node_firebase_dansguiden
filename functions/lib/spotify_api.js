
const SpotifyWebApi = require('spotify-web-api-node')
const SimpleOAuth2 = require('simple-oauth2')

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

function getAccessToken (secrets) {
  const oauth2 = SimpleOAuth2.create({
    client: {
      id: secrets.client_id,
      secret: secrets.client_secret
    },
    auth
  })
  return oauth2.clientCredentials.getToken({})
    .then(oauth2.accessToken.create)
}

module.exports.create = (secrets) => getAccessToken(secrets)
  .then(resp => new SpotifyWebApi({
    clientId: secrets.client_id,
    clientSecret: secrets.client_secret,
    accessToken: resp.token.access_token
  }))
