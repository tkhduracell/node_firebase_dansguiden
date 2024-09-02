import { DanceEvent } from './types'
import _ from 'lodash'

import { snapshotAsObj } from './utils/utils'
import { TableFn, BatchFn } from './utils/database'
import { Place } from './danslogen/places'
import { Artist } from './spotify'
import moment from 'moment'

export async function enrichment(batch: BatchFn, table: TableFn): Promise<{ [key: string]: DanceEvent }> {
  console.log('Fetched metadata_bands table!')
  const bands = snapshotAsObj<Record<string, any>>(await table('metadata_bands').get())

  console.log('Fetched metadata_places table!')
  const places = snapshotAsObj<Record<string, any>>(await table('metadata_places').get())

  const in3Months = moment().add(3, 'months').format('YYYY-MM-DD')
  const eventsTable = await table('events')
    .where('date', '>=', moment().format('YYYY-MM-DD'))
    .where('date', '<=', in3Months)
    .get()

  console.log('Fetched events table!')
  const events = snapshotAsObj<DanceEvent>(eventsTable)

  console.log(`Decorating ${_.size(events)} events`)
  const pairChunks = _.chunk(_.toPairs(events), 500)

  console.log(`Preparing ${pairChunks.length} batches`)

  const batches = pairChunks.map((chunk, idx) => {
    console.debug(`Creating batch#${idx}`)
    const batcher = batch()
    const counters = { touched: 0, unknowns: 0 }

    _.forEach(chunk, ([id, { place: placeName, band: bandName }]) => {
      if (bandName in bands || placeName in places) {

        const band = _.chain(bands).get(bandName)
          .omit('updated_at', 'created_at', 'counts')
          .omitBy(_.isUndefined)
          .value() as Artist
        const place = _.chain(places).get(placeName)
          .omit('updated_at', 'created_at', 'counts')
          .omitBy(_.isUndefined)
          .value() as Place
        batcher.update(table('events').doc(id), { 
          metadata: { 
            band, 
            place
          } 
        })
        counters.touched++
      } else {
        counters.unknowns++
      }
    })

    console.debug(`Executing batch#${idx}, ${JSON.stringify(counters)}`)
    return batcher.commit()
  })

  console.debug("Awaiting all batches...")
  const writes = await Promise.all(batches)

  console.log(`${_.size(writes)} batches and ${_.size(_.flatten(writes))} writes committed succesfully!`)
  return events
}
