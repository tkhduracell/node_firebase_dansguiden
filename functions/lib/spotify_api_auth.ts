
import SpotifyWebApi from 'spotify-web-api-node'
import { AccessToken, ClientCredentials } from 'simple-oauth2'
import z from 'zod'

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

const SecretsSchema = z.object({
  client_id: z.string(),
  client_secret: z.string()
})

export type Secrets = z.infer<typeof SecretsSchema>

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
  static async create(_secrets: Secrets): Promise<SpotifyWebApi>  {
    const secrets = SecretsSchema.parse(_secrets)
    const resp = await getAccessToken(secrets)
    return new SpotifyWebApi({
      clientId: secrets.client_id,
      clientSecret: secrets.client_secret,
      accessToken: resp.token.access_token
    })
  }
}
