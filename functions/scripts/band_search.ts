
import { Bands } from '../src/lib/spotify'
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

async function run(): Promise<void> {
  const client = new SecretManagerServiceClient()
  const [clientIdData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_ID/versions/1'
  })
  const [clientSecretData] = await client.accessSecretVersion({
    name: 'projects/58654864940/secrets/SPOTIFY_CLIENT_SECRET/versions/1'
  })

  const config = {
    client_id: clientIdData.payload?.data?.toString() ?? '',
    client_secret: clientSecretData.payload?.data?.toString() ?? ''
  }

  const band = 'Junix'
  const result = await Bands.getArtist(config, band)

  console.log(`Results for ${band}:`)
  if (result) {
    console.debug(result.genres)
  } else {
    console.error("No results...", result)
  }
}

run()
