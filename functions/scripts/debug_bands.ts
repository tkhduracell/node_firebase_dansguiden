import { SecretManagerServiceClient } from '@google-cloud/secret-manager'
import { Bands } from '../src/lib/spotify'

async function run (): Promise<void> {  
  const client = new SecretManagerServiceClient()
  const [clientIdData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_ID/versions/1'
  })
  const [clientSecretData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_SECRET/versions/1'
  })
  const band = await Bands.getArtist({
    client_id: clientIdData.payload?.data?.toString() ?? '',
    client_secret: clientSecretData.payload?.data?.toString() ?? ''
  }, 'Lövgrens')
  console.log(JSON.stringify(band, null, 2))
}

run()
