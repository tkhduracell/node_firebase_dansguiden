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

enum Schedule {
  DAILY = "every 24 hours",
  HOURLY = "every 1 hours",
  WEEKLY = "every 7 days"
}

function schedule<T>(schedule: Schedule, onTrigger: () => Promise<T>): functions.CloudFunction<unknown> {
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

export const eventsUpdate = schedule(Schedule.WEEKLY, () => {
  return Events.update(batch, table, logger("weekly.updateEvents:"))
})
export const bandsUpdate = schedule(Schedule.WEEKLY, () => {
  return Bands.update(table, logger("weekly.updateBands:"), secrets)
})

export const versionsUpdate = schedule(Schedule.WEEKLY, () => Versions.update(table, logger("weekly.updateVersions:")))
export const metadataUpdate = schedule(Schedule.WEEKLY, () => Metadata.update(table, logger("weekly.updateMetadata:")))

export const versionFetch = http(() => Versions.fetch(table))
export const imagesFetch = http(() => Images.fetch(table))
export const eventsFetch = http(query => Events.fetch(table, query as EventQueryParams, logger('http.eventsFetch')))
