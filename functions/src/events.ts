// Libraries

import _ from 'lodash'
import moment from 'moment'
import {firestore} from 'firebase-admin'

// Dependencies
import * as eventsDecorator from './lib/events_decorator'

import { COLUMNS, EventsParser } from './lib/danslogen/events'
import { snapshotAsArray } from './lib/utils/utils'
import { BatchFn, TableFn } from './lib/utils/database'
import { DanceEvent } from './lib/types'
import { batchDeleteOverlappingEvents, batchWriteEvents } from './lib/utils/batch'

export type EventQueryParams = { from: string; to: string;[key: string]: string }

export class Events {

  static async enrich(table: TableFn, batch: BatchFn) {
    console.log('Starting event enrichment updates')
    await eventsDecorator.enrichment(batch, table)
    console.log('Completed event enrichment update!')
  }

  static async update(table: TableFn, batch: BatchFn) {

    console.log('Parsing all events from external source')
    const allEvents = await EventsParser.parse()
    console.log(`Completed parsing, found ${_.size(allEvents)} events!`)

    console.log('Starting overlap removal')
    await batchDeleteOverlappingEvents(batch, table, allEvents)
    console.log('Completed overlap removal!')

    console.log('Starting event writes')
    const batchWrite = await batchWriteEvents(batch, table, allEvents)
    console.log(`Completed event writes, wrote ${_.size(batchWrite)} events!`)

    return allEvents
  }

  static async fetch(table: TableFn, params: EventQueryParams): Promise<DanceEvent[]> {
    console.log(`Fetch events using params: `, params)
    let query = table('events') as firestore.Query

    // default to today
    query = query
      .where('date', '>=', params.from || moment().format('YYYY-MM-DD'))
      .where('date', '<=', params.to || moment().add(7, 'days').format('YYYY-MM-DD'))

    // apply filters
    COLUMNS
      .filter(col => params[col])
      .forEach(col => {
        query = query.where(col, '==', params[col])
      })

    // order by date_band
    query = query.orderBy('date', 'asc')

    // apply limit
    query = query.limit(_.toSafeInteger(params.limit || '100'))

    const result = await query.get()

    return snapshotAsArray<DanceEvent>(result)
  }
}

