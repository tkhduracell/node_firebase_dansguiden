

import dotenv from 'dotenv'
import path from 'path'
import { BandUpdater } from '../src/band_updater'

async function run(): Promise<void> {
  const secrets = dotenv.config({ path: path.join(__dirname, '..', '.secrets.local') })
  const config = {
    client_id: secrets.parsed?.SPOTIFY_CLIENT_ID ?? '',
    client_secret: secrets.parsed?.SPOTIFY_CLIENT_SECRET ?? ''
  }

  const band = 'Junix'
  const result = await BandUpdater.get(config, band)

  console.log(`Results for ${band}:`)
  if (result) {
    console.debug(result.genres)
  } else {
    console.error("No results...", result)
  }
}

run()
