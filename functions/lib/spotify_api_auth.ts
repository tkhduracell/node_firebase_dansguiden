
import SpotifyWebApi from 'spotify-web-api-node'
import { AccessToken, ClientCredentials } from 'simple-oauth2'

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

export type Secrets = {
  client_id: string;
  client_secret: string;
};

async function getAccessToken (secrets: Secrets): Promise<AccessToken> {
  const oauth2 = new ClientCredentials({
    client: {
      id: secrets.client_id,
      secret: secrets.client_secret
    },
    auth
  })
  const token = await oauth2.getToken({})
  return oauth2.createToken(token)
}

export class SpotifyApiClientFactory {
  static async create(secrets: Secrets): Promise<SpotifyWebApi>  {
    const resp = await getAccessToken(secrets)
    return new SpotifyWebApi({
      clientId: secrets.client_id,
      clientSecret: secrets.client_secret,
      accessToken: resp.token.access_token
    })
  }
}
