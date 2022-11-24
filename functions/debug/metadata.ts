import dotenv from 'dotenv'
import path from 'path'

import { Metadata } from '../src/metadata'
import { database } from '../lib/database'
const { table } = database()

const secrets = dotenv.config({ path: path.join(__dirname, '..', '.secrets.local') })
const places = { api_key: secrets.parsed?.GCLOUD_PLACES_API_KEY ?? '' }
Metadata.places(table, { places }, 5)
  .then((res) => {
    console.log('------------------------------------')
    for (const [key, value] of Object.entries(res)) {
      console.log(key, value)
    }
    return null
  })
  .catch(console.error)
