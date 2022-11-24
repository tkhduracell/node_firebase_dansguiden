// Libraries
import { region, RuntimeOptions, CloudFunction, HttpsFunction} from 'firebase-functions'

import './setup'

import { database } from '../lib/database'
import { Events, Bands, Versions, Images, EventQueryParams } from './core'
import { Metadata } from './metadata'
import { z } from 'zod'

const { table, batch } = database()

// HTTP functions
// Must be us-central1 due to limitation in hosting. Hosting will redirect to wrong domain!
// https://firebase.google.com/docs/functions/locations under "* Important: "
// functions.region("europe-west-1").https

function schedule<T>(schedule: string, onTrigger: () => Promise<T>, extra?: Partial<RuntimeOptions>): CloudFunction<unknown> {
  return region('europe-west1')
    .runWith({timeoutSeconds: 540, ...(extra ?? {})}) // Timeout 9 min
    .pubsub
    .schedule(schedule)
    .timeZone('Europe/Stockholm')
    .onRun(async () => await onTrigger())
}

function http<T>(onCalled: (query: Record<string, string>) => Promise<T>, extra?: Partial<RuntimeOptions>): HttpsFunction {
  return region('europe-west1')
  .runWith(extra ?? {}) // Timeout 9 min
  .https
  .onRequest(async (req, res) => {
    try {
      const result = await onCalled(req.query as unknown as Record<string, string>)
      res.status(200).send(result)
    } catch (err) {
      res.status(500).send('Internal error: ' + err)
    }
  })
}

export const eventsUpdate = schedule("every monday 09:00", () => {
  return Events.update(batch, table)
})
export const bandsUpdate = schedule("every monday 10:00", () => {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = z.object({
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string()
  }).parse(process.env)
  return Bands.update(table, {
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET
  })
}, { secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'] })

// Metadata
export const metadataUpdate = schedule("0 11 * * *", () => {
  const { GCLOUD_PLACES_API_KEY } = z.object({
    GCLOUD_PLACES_API_KEY: z.string()
  }).parse(process.env)
  const extra = { places_api_key: GCLOUD_PLACES_API_KEY }
  return Metadata.update(table, extra)
}, { secrets: ['GCLOUD_PLACES_API_KEY'] })

// Playstore version
export const versionsUpdate = schedule("every monday 12:00", () => {
  return Versions.update(table)
})


export const versionFetch = http(() => Versions.fetch(table))
export const imagesFetch = http(() => Images.fetch(table))
export const eventsFetch = http(query => Events.fetch(table, query as EventQueryParams))
