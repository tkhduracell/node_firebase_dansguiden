// Libraries
import functions, { RuntimeOptions, CloudFunction, HttpsFunction} from 'firebase-functions'

import './setup'

import { database } from '../lib/database'
import { Events, Bands, Versions, Images, EventQueryParams } from './core'
import { Metadata } from './metadata'

const { table, batch } = database()

// HTTP functions
// Must be us-central1 due to limitation in hosting. Hosting will redirect to wrong domain!
// https://firebase.google.com/docs/functions/locations under "* Important: "
// functions.region("europe-west-1").https

function schedule<T>(schedule: string, onTrigger: () => Promise<T>, extra?: Partial<RuntimeOptions>): CloudFunction<unknown> {
  return functions.region('europe-west1')
    .runWith({timeoutSeconds: 540, ...(extra ?? {})}) // Timeout 9 min
    .pubsub
    .schedule(schedule)
    .timeZone('Europe/Stockholm')
    .onRun(async () => await onTrigger())
}

function http<T>(onCalled: (query: Record<string, string>) => Promise<T>, extra?: Partial<RuntimeOptions>): HttpsFunction {
  return functions.region('europe-west1')
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

const logger = (prefix: string): (msg: string) => void => console.log.bind(console.log, prefix)

export const eventsUpdate = schedule("every monday 09:00", () => {
  return Events.update(batch, table, logger("weekly.updateEvents:"))
})
export const bandsUpdate = schedule("every monday 10:00", () => {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env
  return Bands.update(table, {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client_id: SPOTIFY_CLIENT_ID!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client_secret: SPOTIFY_CLIENT_SECRET!
  }, logger("weekly.updateBands:"))
}, { secrets: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'] })

// Counts
export const metadataUpdate = schedule("0 11 * * *", () => Metadata.update(table, logger("weekly.updateMetadata:")))

// Playstore version
export const versionsUpdate = schedule("every monday 12:00", () => {
  return Versions.update(table, logger("weekly.updateVersions:"))
})


export const versionFetch = http(() => Versions.fetch(table))
export const imagesFetch = http(() => Images.fetch(table))
export const eventsFetch = http(query => Events.fetch(table, query as EventQueryParams, logger('http.eventsFetch')))
