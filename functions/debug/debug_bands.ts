import { database } from '../lib/database'
const { table } = database()

import {BandUpdater} from '../src/band_updater'
import {simpleKeyValue} from '../lib/store'
import { Artist } from '../lib/types'

const bandMetadataStore = simpleKeyValue<Artist>(table, 'band_metadata', false)

async function run (): Promise<void> {
  const secrets = await require('../../.secrets.json')

  const band = await BandUpdater.update(bandMetadataStore, secrets, ['Lövgrens'])
  console.log(JSON.stringify(band, null, 2))
}

run()
