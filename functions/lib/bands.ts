import _ from 'lodash'
import SpotifyWebApi from 'spotify-web-api-node'

import { Secrets, SpotifyApiClientFactory } from '../lib/spotify_api_auth'
import { delayed, serial } from './promises'
import { Artist } from './types'
import { Store } from './store'

const commonGenres = [
  'dansband',
  'danspunk',
  'danseband',
  'folkmusik',
  'swedish pop',
  'classic swedish pop',
  'swedish folk pop',
  'rockabilly',
  'rock-and-roll'
]

const remapping = {
  'PerHåkans': 'Per-Håkans',
  'Larz Kristers': 'Larz-Kristers'
} as { [key: string]: string }

const randomInt = (max: number): number => Math.round(Math.random() * max)
const normalize = (str: string): string => str.toLowerCase().replace(/[^\wåäö]+/gi, '')

type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  images: string[];
}

function isSimilar (lhs: string, rhs: string): boolean {
  return normalize(lhs) === normalize(rhs)
}

function removeSuffix (band: string): string {
  return band.replace(/\W+\([[:upper:]]+\)/gi, '')
}

function remap (band: string): string {
  return remapping[band] || band
}

function isDansbandish(a: { genres: string[] }): boolean {
  return _.isEmpty(a.genres) ||
    _.size(_.intersection(a.genres, commonGenres)) > 0
}

function findArtistInfo(band: string, artists: SpotifyApi.ArtistObjectFull[]): SpotifyArtist | {} {
  const results = artists.filter(a => isSimilar(a.name, band))
    .filter(isDansbandish)
    .map(a => _.pick(a, ['id', 'name', 'genres', 'images']))
  return _.first(results) || {}
}

async function searchArtist (api: SpotifyWebApi, artist: string): Promise<SpotifyApi.ArtistObjectFull[]> {
  const result = await api.searchArtists(artist, { limit: 10, market: 'SE' })
  const items = result.body.artists ? result.body.artists.items : []
  return items
}

async function updateArtistMetadataForBand (api: SpotifyWebApi, store: Store<Artist>, band: string): Promise<Artist> {

  const artistInfo = await store.get(band)

  if (artistInfo && _.size(artistInfo) > 0) {
    console.log('Found artist', band)
    return artistInfo
  } else {
    console.log('Searching for artist', band)
    const delayedBand = await delayed(band, randomInt(5000))

    const remapped = remap(removeSuffix(delayedBand))

    const spotifyArtists = await searchArtist(api, remapped)

    const mostSimilarArtist = findArtistInfo(band, spotifyArtists)

    return store.set(band, mostSimilarArtist as Artist) // Set even if empty
  }
}

export class BandUpdater {
  static async run(store: Store<Artist>, secrets: Secrets, bands: string[]): Promise<Artist[]> {
    const client = await SpotifyApiClientFactory.create(secrets)

    const results = bands.map(band => updateArtistMetadataForBand(client, store, band))

    return serial(results)
  }
}
