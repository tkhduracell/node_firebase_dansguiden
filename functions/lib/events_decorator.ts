import { DanceEvent } from './types'
import _ from 'lodash'

import { snapshotAsObj } from './utils'
import { TableFn, BatchFn } from './database'

export async function update (batch: BatchFn, table: TableFn): Promise<object> {
  console.log('Fetched metadata_bands table!')
  const bands = snapshotAsObj<Record<string, any>>(await table('metadata_bands').get())

  console.log('Fetched metadata_places table!')
  const places = snapshotAsObj<Record<string, any>>(await table('metadata_places').get())

  const eventsTable = await table('events').get()
  console.log('Fetched events table!')
  const events = snapshotAsObj<DanceEvent>(eventsTable)

  console.log(`Decorating ${_.size(events)} events`)
  const pairChunks = _.chunk(_.toPairs(events), 500)

  const batches = pairChunks.map((chunk, idx) => {
    console.debug(`Creating batch#${idx}`)
    const batcher = batch()
    const counters = { touched: 0, unknowns: 0 }

    _.forEach(chunk, ([id, {place, band}]) => {
      if (band in bands || place in places) {

        batcher.update(table('events').doc(id), {
          metadata: {
            band: _.omitBy(bands[band], _.isUndefined),
            place: _.omitBy(places[place], _.isUndefined),
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
