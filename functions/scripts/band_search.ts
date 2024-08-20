

import dotenv from 'dotenv'
import path from 'path'
import { Bands } from '../src/lib/spotify'

async function run(): Promise<void> {
  const secrets = dotenv.config({ path: path.join(__dirname, '..', '.secrets.local') })
  const config = {
    client_id: secrets.parsed?.SPOTIFY_CLIENT_ID ?? '',
    client_secret: secrets.parsed?.SPOTIFY_CLIENT_SECRET ?? ''
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
