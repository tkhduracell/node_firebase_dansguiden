/* eslint-disable promise/no-nesting */
import dotenv from 'dotenv'
import path from 'path'

import { Metadata } from '../src/metadata'
import { database } from '../src/lib/utils/database'

const { table, batch } = database()

export function clear(tbl: string) {
  const t = table(tbl)
  return t.get()
    .then(res => Promise.all(res.docs.map(d => {
      return new Promise((res) => setTimeout(res, 100))
        .then(() => t.doc(d.id).delete())
        .then(() => console.log('Deleted', d.id))
    })))
    .catch(console.error)
}

clear('metadata_bands')
clear('metadata_places')
clear('metadata_dates')

if (new Date().getTime() > 0) process.exit()

const secrets = dotenv.config({ path: path.join(__dirname, '..', '.secrets.local') })
const places = { api_key: secrets.parsed?.GCLOUD_PLACES_API_KEY ?? '' }
Metadata.places(table, batch, { places }, 0)
  .then((res) => {
    console.log('------------------------------------')
    for (const [key, value] of Object.entries(res ?? {})) {
      console.log(key, value)
    }
    return null
  })
  .catch(console.error)
