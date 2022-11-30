// Libraries
import { region, RuntimeOptions, CloudFunction, HttpsFunction} from 'firebase-functions'

import './setup'

import { Events, EventQueryParams } from './core'
import { Metadata } from './metadata'
import { z } from 'zod'

import { database } from '../lib/database'
import { Versions } from './versions'
import { Images } from './images'
import { BandUpdater } from './band_updater'
const { table, batch } = database()

function schedule<T>(schedule: string, onTrigger: () => Promise<T>, extra?: Partial<RuntimeOptions>): CloudFunction<unknown> {
  return region('europe-west1')
    .runWith({ timeoutSeconds: 540,  memory: '1GB', ...(extra ?? {})}) // Timeout 9 min
    .pubsub
    .schedule(schedule)
    .timeZone('Europe/Stockholm')
    .onRun(async () => await onTrigger())
}

function http<T>(onCalled: (query: Record<string, string>) => Promise<T>, extra?: Partial<RuntimeOptions>): HttpsFunction {
  return region('europe-west1')
  .runWith(extra ?? {})
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

// Update Events
export const eventsUpdate = schedule("every monday 08:00", () => {
  return Events.update(table, batch)
})

// Metadata Bands
export const bandsUpdate = schedule("every monday 09:00", () => {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = z.object({
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string()
  }).parse(process.env)
  return BandUpdater.run(table, {
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET
  })
}, { secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'] })

// Metadata Places
export const metadataPlaces = schedule("every monday 10:00", () => {
  const { GCLOUD_PLACES_API_KEY } = z.object({
    GCLOUD_PLACES_API_KEY: z.string()
  }).parse(process.env)
  const places = { api_key: GCLOUD_PLACES_API_KEY }
  return Metadata.places(table, batch, { places })
}, { secrets: ['GCLOUD_PLACES_API_KEY'] })

// Metadata Bands
export const metadataBands = schedule("every monday 11:00", () => {
  const {
    SPOTIFY_CLIENT_ID: client_id,
    SPOTIFY_CLIENT_SECRET: client_secret
  } = z.object({
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string()
  }).parse(process.env)
  const spotify = { client_id, client_secret }
  return Metadata.bands(table, batch,{ spotify })
}, { secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'] })

// Metadata Dates
export const metadataDates = schedule("every monday 12:00", () => {
  return Metadata.dates(table, batch)
})

// Event enrichment
export const eventsEnrichment = schedule("every monday 13:00", () => {
  return Events.enrich(table, batch)
})

// Playstore version
export const versionsUpdate = schedule("every monday 14:00", () => {
  return Versions.update(table)
})

export const versionFetch = http(() => Versions.fetch(table))
export const imagesFetch = http(() => Images.fetch(table))
export const eventsFetch = http(query => Events.fetch(table, query as EventQueryParams))
