import _ from 'lodash'
import SpotifyWebApi from 'spotify-web-api-node'

import { Artist } from '../lib/types'

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
  '42dnStXXTO4OXleuxwGL9F', // Andreas J
  '4t56SOthZtGQkZdgZrAeqK', // Allstars,
  '0MzvueasOOSFOrMKdkKb9C', // Bagatelle,
  '3zo2TkHcXi6iXQxp4bipYW', // Bendix
  '3h7VkDi0XjJMAtgZS4chp7', // Bendix
  '7Fhj0K08T75UchC1p8T6g1', // Barons
  '0hYTsX1dRl01ss8jizhrJo', // Framed & Keko
  '0kbxBTkWdVjByBeVVzSckZ', // Jive (rulltrappor)
  '5ecCx0PnQGB6odt9F9XD46', // Caspers,
  'https://open.spotify.com/artist/377JJnVNZmREVqD5qIe18J', // Streaks
  'https://open.spotify.com/artist/4zYFHS8R8wSOhcIBEbwxwA', // Charlies
  'https://open.spotify.com/artist/60rrONrFQipKsTXYazdmQO', // Remix,
  'https://open.spotify.com/artist/3CEF3A8IybbJcwFSUVtAYM', // Strike
  'https://open.spotify.com/artist/6zNO1D32YLKnbC87DYVVBx', // Junix
  'https://open.spotify.com/artist/3zHaWg01z30TzjlWqSpeB4', // Karl Erik
  'https://open.spotify.com/artist/5XZN5RKQkiN6hGofPCnpjK', // Serenad
  'https://open.spotify.com/artist/5QmZNcdq0h1NuL1G7t2yGp', // Tempo
  'https://open.spotify.com/artist/2wpdrWJCZhr737YxVJh2fe', // Bendix
  'https://open.spotify.com/artist/0XY9QKkTnONBkjszYTfsZl', // Cedrix
  'https://open.spotify.com/artist/56url7nLtPIXWu0PD6XhIw', // Freqvens
  'https://open.spotify.com/artist/5Aql8TJ5Kfjf9f0hjtXiKZ', // Framed
  'https://open.spotify.com/artist/4AiqdizfguNQoWQ5N6Aaza', // C-Laget
  'https://open.spotify.com/artist/36jTseDCcfNAXsplm6dHiT', // Glads,
  'https://open.spotify.com/artist/0B114ZpJddB3jl8AHu4OKT', // Phix
  'https://open.spotify.com/artist/2iGJ84wIQmPyqa0NYKAjty', // Christer Eklund
].map(linkToId)

const exact = _.mapValues({
  'Holidays': '6IxjXsaqZ81Fi1HiwRq4LS',
  'Framed': 'https://open.spotify.com/artist/5vDnmN0QFphRUc5mNfPjtf?si=SYBL_F4-Qe-GNERFUmmLBQ'
} as Record<string, string>, linkToId)

const remapping = {
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
  return exact[target] === a.id
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
