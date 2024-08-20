import _ from 'lodash'
import SpotifyWebApi from 'spotify-web-api-node'

import { Artist } from './index'

const linkToId = (s: string) => s.replace(/https:\/\/open.spotify.com\/artist\/(.*)(\?.*)?/gi, '$1').replace(/\?.*/, '')

const commonGenres = [
  'dansband',
  'danspunk',
  'danseband',
  'folkmusik',
  'swedish pop',
  'classic swedish pop',
  'swedish folk pop',
  'swedish country',
  'rockabilly',
  'rock-and-roll'
]

const blacklist = [
  '0B114ZpJddB3jl8AHu4OKT', // Phix
  '0hYTsX1dRl01ss8jizhrJo', // Framed & Keko
  '0kbxBTkWdVjByBeVVzSckZ', // Jive (rulltrappor)
  '0MzvueasOOSFOrMKdkKb9C', // Bagatelle,
  '0XY9QKkTnONBkjszYTfsZl', // Cedrix
  '2iGJ84wIQmPyqa0NYKAjty', // Christer Eklund
  '2wpdrWJCZhr737YxVJh2fe', // Bendix
  '36jTseDCcfNAXsplm6dHiT', // Glads,
  '377JJnVNZmREVqD5qIe18J', // Streaks
  '3CEF3A8IybbJcwFSUVtAYM', // Strike
  '3h7VkDi0XjJMAtgZS4chp7', // Bendix
  '3zHaWg01z30TzjlWqSpeB4', // Karl Erik
  '3zo2TkHcXi6iXQxp4bipYW', // Bendix
  '42dnStXXTO4OXleuxwGL9F', // Andreas J
  '4AiqdizfguNQoWQ5N6Aaza', // C-Laget
  '4C3XwtLJafxjFTvHLxUsKS', // Strike
  '4t56SOthZtGQkZdgZrAeqK', // Allstars,
  '4zYFHS8R8wSOhcIBEbwxwA', // Charlies
  '56url7nLtPIXWu0PD6XhIw', // Freqvens
  '5Aql8TJ5Kfjf9f0hjtXiKZ', // Framed
  '5ecCx0PnQGB6odt9F9XD46', // Caspers,
  '5QmZNcdq0h1NuL1G7t2yGp', // Tempo
  '5XZN5RKQkiN6hGofPCnpjK', // Serenad
  '60rrONrFQipKsTXYazdmQO', // Remix,
  '6zNO1D32YLKnbC87DYVVBx', // Junix
  '7Fhj0K08T75UchC1p8T6g1', // Barons
].map(linkToId)

const promotedCandidates = _.mapValues({
  'Holidays': '6IxjXsaqZ81Fi1HiwRq4LS',
  'Eloge': '3rOpdjTyTjMpBDQXWClnav',
  'Framed': '5vDnmN0QFphRUc5mNfPjtf'
} as Record<string, string>, linkToId)

const remapping = {
  'Eloge': 'Eloge Orkester',
  'PerHåkans': 'Per-Håkans',
  'PHs': 'Per-Håkans',
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

function isWhitelisted(a: { id: string }, target: string): boolean {
  return promotedCandidates[target] === a.id
}

function score (a: SpotifyApi.ArtistObjectFull, target: string): number {
  let score = 0
  if (isWhitelisted(a, target)) score+=10
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
  for (const a of artists.sort((a, b) => compare(a, b, band)).slice(0, 3)) {
    const selected = isDansbandishOrUnknown(a) && isNotBlacklisted(a) && isSimilar(a.name, band)
    console.debug(selected ? " -->" : "    ", JSON.stringify({
      score: score(a, band),
      name: a.name,
      link: `https://open.spotify.com/artist/${a.id}`,
      genres: a.genres.join(',')
    }))
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
  const result = await api.searchArtists(artist, { limit: 12, market: 'SE' })
  const items = result.body.artists ? result.body.artists.items : []
  return items
}
