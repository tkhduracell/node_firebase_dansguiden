import { database } from '../lib/database'
const { table } = database()

import {BandUpdater} from '../src/band_updater'
import {simpleKeyValue} from '../lib/store'
import { Artist } from '../lib/types'

const bandMetadataStore = simpleKeyValue<Artist>(table, 'band_metadata', false)

// Older events are broken
console.log('-------------------------------------------------')

/*
const query = tbl => tbl.where('date', '>=', '2019-01-01')
const allBands = store.getValues(table, 'events', doc => doc.band, query)
  .then(_.uniq)
  .then(Array.sort)
*/

async function run (): Promise<void> {
  const secrets = await require('../../.secrets.json')

  const band = await BandUpdater.run(bandMetadataStore, secrets, ['Lövgrens'])
  console.log(JSON.stringify(band, null, 2))
}

run()
