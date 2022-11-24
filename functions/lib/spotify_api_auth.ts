
import SpotifyWebApi from 'spotify-web-api-node'
import { AccessToken, ClientCredentials } from 'simple-oauth2'

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

async function getAccessToken (secrets: { client_id: string, client_secret: string}): Promise<AccessToken> {
  const oauth2 = new ClientCredentials({
    client: {
      id: secrets.client_id,
      secret: secrets.client_secret
    },
    auth
  })
  const { token } = await oauth2.getToken({})
  return oauth2.createToken(token)
}

export class SpotifyApiClientFactory {
  static async create(secrets: { client_id: string, client_secret: string}): Promise<SpotifyWebApi>  {
    const { token } = await getAccessToken(secrets)
    const opts = {
      clientId: secrets.client_id,
      clientSecret: secrets.client_secret,
      accessToken: token.access_token
    }
    return new SpotifyWebApi(opts)
  }
}
