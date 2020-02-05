
import SpotifyWebApi from 'spotify-web-api-node'
import SimpleOAuth2 from 'simple-oauth2'

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

export type Secrets = {
  client_id: string;
  client_secret: string;
};

async function getAccessToken (secrets: Secrets): Promise<SimpleOAuth2.AccessToken> {
  const oauth2 = SimpleOAuth2.create({
    client: {
      id: secrets.client_id,
      secret: secrets.client_secret
    },
    auth
  })
  const token = await oauth2.clientCredentials.getToken({})
  return oauth2.accessToken.create(token)
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
