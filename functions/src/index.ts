// Libraries
import * as functions from 'firebase-functions'

import './setup'

import { SecretsFactory } from '../lib/secrets'
import { database } from '../lib/database'
import { Events, Bands, Versions, Metadata, Images, EventQueryParams } from './core'
const { table, batch } = database()

const secrets = SecretsFactory.init()

// HTTP functions
// Must be us-central1 due to limitation in hosting. Hosting will redirect to wrong domain!
// https://firebase.google.com/docs/functions/locations under "* Important: "
// functions.region("europe-west-1").https

function schedule<T>(schedule: string, onTrigger: () => Promise<T>): functions.CloudFunction<unknown> {
  return functions.region('europe-west1')
    .runWith({timeoutSeconds: 540}) // Timeout 9 min
    .pubsub
    .schedule(schedule)
    .onRun(async () => await onTrigger())
}

function http<T>(onCalled: (query: {[key: string]: string}) => Promise<T>): functions.HttpsFunction {
  return functions.region('europe-west1').https.onRequest(async (req, res) => {
    try {
      const result = await onCalled(req.query)
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
  return Bands.update(table, logger("weekly.updateBands:"), secrets)
})

// Counts
export const metadataUpdate = schedule("daily 11:00", () => Metadata.update(table, logger("weekly.updateMetadata:")))

// Playstore version
export const versionsUpdate = schedule("every monday 12:00", () => Versions.update(table, logger("weekly.updateVersions:")))


export const versionFetch = http(() => Versions.fetch(table))
export const imagesFetch = http(() => Images.fetch(table))
export const eventsFetch = http(query => Events.fetch(table, query as EventQueryParams, logger('http.eventsFetch')))
