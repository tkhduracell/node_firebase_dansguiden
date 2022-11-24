import _ from 'lodash'
import firebase from 'firebase-admin'

import { snapshotAsObj } from './utils'
import { TableFn, BatchFn } from './database'
import { ArtistImage } from './types'

function getImage (images: ArtistImage[]): string | null {
  return (_.first(
    _.orderBy(images || [], i => (i.height || 1) * (i.width || 1))
  ) || { url: null }).url
}

function getImageAndId(metadata: firebase.firestore.DocumentData): SpotifyMetadata | null {
  return _.isEmpty(metadata) ? null : {
    "spotify_id": metadata.id as string,
    "spotify_image": getImage(metadata.images as ArtistImage[])
  }
}

function remap (band: string): string {
  return band.replace(/-/gi, '')
}

export async function update (batch: BatchFn, table: TableFn): Promise<object> {
  const metadataTable = await table('band_metadata').get()
  console.log('Fetched band_metadata table!')
  const meta = snapshotAsObj<SpotifyMetadata | null>(metadataTable, m => getImageAndId(m))

  const eventsTable = await table('events').get()
  console.log('Fetched events table!')
  const events = snapshotAsObj<string>(eventsTable, e => e.band)

  console.log(`Joining ${_.size(events)} events with ${_.size(meta)} bands`)
  const pairChunks = _.chunk(_.toPairs(events), 500)

  const batches = pairChunks.map((chunk, idx) => {
    console.debug(`Creating batch#${idx}`)
    const batcher = batch()
    const counters = { touched: 0, unknowns: 0 }
    _.forEach(chunk, ([id, band]) => {
      if (meta[band] || meta[remap(band)]) {
        const metadata = meta[band] || meta[remap(band)]
        const changeset = _.omitBy(metadata, _.isUndefined)
        batcher.update(table('events').doc(id), changeset)
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

type SpotifyMetadata = {
  spotify_id: string;
  spotify_image: string | null;
}
