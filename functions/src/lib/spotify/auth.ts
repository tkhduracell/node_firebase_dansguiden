
import { AccessToken, ClientCredentials } from 'simple-oauth2'

const auth = {
  tokenHost: 'https://accounts.spotify.com',
  tokenPath: '/api/token'
}

export async function getAccessToken (secrets: { client_id: string, client_secret: string}): Promise<AccessToken> {
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

