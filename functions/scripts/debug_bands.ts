import { Bands } from '../src/lib/spotify'

async function run (): Promise<void> {
  const secrets = await require('../../.secrets.json')

  const band = await Bands.getArtist(secrets, 'Lövgrens')
  console.log(JSON.stringify(band, null, 2))
}

run()
