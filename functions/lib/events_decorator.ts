/* eslint-disable @typescript-eslint/camelcase */
import _ from 'lodash'
import firebase from 'firebase-admin'

import { snapshotAsObj } from './utils'
import { TableFn, BatchFn } from './database'
import { LogFn } from './log'
import { ArtistImage } from './types'

function getImage (images: ArtistImage[]): string | null {
  return (_.first(
    _.orderBy(images || [], i => i.height * i.width)
  ) || { url: null }).url
}

function getImageAndId(metadata: firebase.firestore.DocumentData): SpotifyMetadata | null {
  return _.isEmpty(metadata) ? null : {
    spotify_id: metadata.id as string,
    spotify_image: getImage(metadata.images as ArtistImage[])
  }
}

function remap (band: string): string {
  return band.replace(/-/gi, '')
}

export function update (batch: BatchFn, table: TableFn, log: LogFn): Promise<object> {
  const metadata = table('band_metadata')
    .get()
    .then(snapshot => {
      log('Fetched band_metadata table!')
      return snapshotAsObj(snapshot, m => getImageAndId(m))
    })

  const eventsKeys = table('events')
    .get()
    .then(snapshot => {
      log('Fetched events table!')
      return snapshotAsObj(snapshot, e => e.band)
    })

  return Promise.all([eventsKeys, metadata])
    .then(arr => {
      log('Starting events batch updates')
      const [events, meta] = arr
      log(`Joining ${_.size(events)} events with ${_.size(meta)} bands`)
      const pairChunks = _.chunk(_.toPairs(events), 500)
      return Promise.all(pairChunks.map((chunk, idx) => {
        log('Building batch#' + idx)
        const batcher = batch()
        const counters = { touched: 0, unknowns: 0 }
        _.forEach(chunk, (pair) => {
          const [id, band] = pair
          const bandRemaped = remap(band)
          const doc = table('events').doc(id)
          if (meta[band] || meta[bandRemaped]) {
            const metadata = meta[band] || meta[bandRemaped]
            const changeset = _.omitBy(metadata, _.isUndefined)
            batcher.update(doc, changeset)
            counters.touched++
            // log(`Updating event ${id} with data for ${band} => ${JSON.stringify(changeset)}`)
          } else {
            counters.unknowns++
          }
        })
        log(`Executing batch#${idx}, ${JSON.stringify(counters)}`)
        return batcher.commit()
      }))
    })
    .then(writes => {
      log(`${_.size(writes)} batches committed succesfully!`)
      return eventsKeys
    })
}

type SpotifyMetadata = {
  spotify_id: string;
  spotify_image: string | null;
}
