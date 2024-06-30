import _ from 'lodash'
import SpotifyWebApi from 'spotify-web-api-node'

import { SpotifyApiClientFactory } from '../lib/spotify_api_auth'
import { serialDelayedFns } from '../lib/promises'
import { Artist, DanceEvent } from '../lib/types'
import { getValues, simpleKeyValue, Store } from '../lib/store'
import { firestore } from 'firebase-admin'
import { findArtistInfo, searchArtist, remapArtist } from '../lib/artists'
import { TableFn } from '../lib/database'

const FieldValue = firestore.FieldValue
type FieldValue = typeof FieldValue


async function updateArtistInfoFromSpotify (api: SpotifyWebApi, store: Store<Artist>, band: string): Promise<Artist> {
  const oldData = await store.get(band)
  const remapped = remapArtist(band)
  const spotifyArtists = await searchArtist(api, remapped)

  const mostSimilarArtist = findArtistInfo(remapped, spotifyArtists)
  const explain = mostSimilarArtist
    ? `${mostSimilarArtist.name} (${mostSimilarArtist.id}) seems to be best candidate`
    : 'none seemed applicable'
  console.debug(`Found ${_.size(spotifyArtists)} artist, but ${explain}`)

  if (oldData && _.isEqual(mostSimilarArtist || {}, oldData)) {
    return oldData
  } else {
    const update = Object.assign({}, mostSimilarArtist || {} as Artist, {
      "updated_at": FieldValue.serverTimestamp()
    })
    return await store.set(band, update) // Set even if empty
  }
}

export type SpotifyClientConfig = {
  client_id: string,
  client_secret: string
}

export class BandUpdater {
  static async update(store: Store<Artist>, secrets: SpotifyClientConfig, bands: string[]): Promise<(Artist|null)[]> {
    const client = await SpotifyApiClientFactory.create(secrets)

    const results = bands.map(band => (): Promise<Artist | null> => {
      try {
        return updateArtistInfoFromSpotify(client, store, band)
      } catch (error) {
        console.warn(`Unable to update artist ${band}`, error)
        return Promise.resolve(null)
      }
    })

    // Delayed and serial execution
    return serialDelayedFns(results, 1000, 200)
  }

  static async get(secrets: SpotifyClientConfig, band: string): Promise<Artist | undefined> {
    const remapped = remapArtist(band)
    try {
      const client = await SpotifyApiClientFactory.create(secrets)
      const spotifyArtists = await searchArtist(client, remapped)
      const mostSimilarArtist = findArtistInfo(remapped, spotifyArtists)
      return mostSimilarArtist
    } catch (e) {
      console.warn('Error looking up artist', { band, remapped }, _.get(e, 'output', e))
      return Promise.resolve(undefined)
    }
  }

  static async run(table: TableFn, spotify: SpotifyClientConfig, breakoff = '2022-01-01'): Promise<(Artist|null)[]> {
    const bandsKeyValueStore = simpleKeyValue<Artist>(table, 'band_metadata', true)

    console.log('Getting current bands in events')
    const allBands = await getValues<string, DanceEvent>(table, 'events',
      event => event.band,
      tbl => tbl.where('date', '>=', breakoff)
    )
    const bands = _.uniq(allBands).sort()

    console.log('Starting band update')
    const updates = await BandUpdater.update(bandsKeyValueStore, spotify, bands)

    console.log('Completed band metadata update!')
    console.log(`Wrote ${_.size(updates)} bands`)

    return updates
  }
}
