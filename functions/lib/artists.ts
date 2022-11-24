import _ from 'lodash'
import SpotifyWebApi from 'spotify-web-api-node'

import { Artist } from '../lib/types'


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

const blacklist = [
  '42dnStXXTO4OXleuxwGL9F', // Andreas J
  '4t56SOthZtGQkZdgZrAeqK', // Allstars,
  '0MzvueasOOSFOrMKdkKb9C', // Bagatelle,
  '3zo2TkHcXi6iXQxp4bipYW', // Bendix
  '3h7VkDi0XjJMAtgZS4chp7', // Bendix
  '7Fhj0K08T75UchC1p8T6g1', // Barons
  '0hYTsX1dRl01ss8jizhrJo', // Framed & Keko
  '0kbxBTkWdVjByBeVVzSckZ' // Jive (rulltrappor)
]

const remapping = {
  'PerHåkans': 'Per-Håkans',
  'Larz Kristers': 'Larz-Kristers',
  'Agneta & Peter' : 'Agneta Olsson',
  'Anne Nørdsti (N)': 'Anne Nørdsti',
  'Tommys (FIN)': 'Tommys'
} as { [key: string]: string }

const normalize = (str: string): string => str.toLowerCase().replace(/[^\wåäö]+/gi, '')

function isSimilar (lhs: string, rhs: string): boolean {
  return normalize(lhs) === normalize(rhs)
}

function removeSuffix (band: string): string {
  return band.replace(/\W+\([[:upper:]]+\)/gi, '')
}

function remap (band: string): string {
  return remapping[band] || band
}

function isDansbandishStrict(a: { genres: string[] }): boolean {
  return _.size(_.intersection(a.genres, commonGenres)) > 0
}

function isDansbandishOrUnknown(a: { genres: string[] }): boolean {
  return _.isEmpty(a.genres) || isDansbandishStrict(a)
}

function isNotBlacklisted(a: {  id:  string }): boolean {
  return !blacklist.includes(a.id)
}

function score (a: SpotifyApi.ArtistObjectFull, target: string): number {
  let score = 0
  if (isDansbandishOrUnknown(a)) score++
  if (isDansbandishStrict(a)) score++
  if (isNotBlacklisted(a)) score++
  if (isSimilar(a.name, target)) score++
  return score
}

function compare (a: SpotifyApi.ArtistObjectFull, b: SpotifyApi.ArtistObjectFull, target: string): number {
  return score(b, target) -  score(a, target)
}

export function remapArtist (band: string) {
  const out = remap(removeSuffix(band))
  if (out !== band) console.debug(`Remapped artist from ${band} -> ${out}`)
  return out
}

export function findArtistInfo(band: string, artists: SpotifyApi.ArtistObjectFull[]): Artist | undefined {

  console.debug('    -----  Search results ----- ')
  for (const a of artists.sort((a, b) => compare(a, b, band))) {
    const selected = isDansbandishOrUnknown(a) && isNotBlacklisted(a) && isSimilar(a.name, band) ? " -->" : "    "
    console.debug(selected, JSON.stringify({
      id: a.id,
      score: score(a, band),
      name: a.name,
      genres: a.genres.join(','),
      isDansbandishOrUnknown: isDansbandishOrUnknown(a),
      isDansbandishStrict: isDansbandishStrict(a),
      isNotBlacklisted: isNotBlacklisted(a),
      isSimilar: isSimilar(a.name, band)
    }).split('').slice(0, 160).join(''))
  }

  return artists.filter(a => isSimilar(a.name, band))
    .filter(isDansbandishOrUnknown)
    .filter(isNotBlacklisted)
    .sort((a, b) => compare(a, b, band))
    .map(a => _.pick(a, ['id', 'name', 'genres', 'images']))
    .find(() => true)
}

export async function searchArtist (api: SpotifyWebApi, artist: string): Promise<SpotifyApi.ArtistObjectFull[]> {
  console.debug("Spotify API call for artist", artist)
  const result = await api.searchArtists(artist, { limit: 10, market: 'SE' })
  const items = result.body.artists ? result.body.artists.items : []
  return items
}
