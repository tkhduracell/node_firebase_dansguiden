import { enrichment } from './events_decorator'

import { BatchFn, database, TableFn } from './utils/database'


import { mockFirebase } from 'firestore-jest-mock'

let table: TableFn
let batch: BatchFn

describe('enrichment', () => {
  beforeEach(() => {
    mockFirebase({
      database: {
        metadata_bands: {
          band1: { name: 'Band 1' }
        },
        metadata_places: {
          place1: { name: 'Place 1' }
        },
        events: {
          event1: { place: 'place1', band: 'band1' },
          event2: { place: 'place2', band: 'band2' },
        }
      }
    })
    const fns = database()
    table = fns.table
    batch = fns.batch

  })

  it('should fetch metadata and events tables', async () => {
    await enrichment(batch, table)

    expect(table).toHaveBeenCalledWith('metadata_bands')
    expect(table).toHaveBeenCalledWith('metadata_places')
    expect(table).toHaveBeenCalledWith('events')
  })

  it('should decorate events with metadata', async () => {

    const result = await enrichment(batch, table)

    expect(result).toMatchInlineSnapshot(``)
    expect(batch().update).toHaveBeenCalledWith(
      table('events').doc('event1'),
      { metadata: { band: { name: 'Band 1' }, place: { name: 'Place 1' } } }
    )
  })

  it('should handle unknown bands and places', async () => {
    const result = await enrichment(batch, table)

    expect(result).toMatchInlineSnapshot(``)
    expect(batch().update).not.toHaveBeenCalled()
  })

})