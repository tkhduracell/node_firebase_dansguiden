const _ = require('lodash')
const { delayed, serial } = require('./promises')
const SpotifyApi = require('../lib/spotify_api')

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

const randomInt = max => Math.round(Math.random() * max)
const normalize = str => str.toLowerCase().replace(/[^\wåäö]+/gi, '')

function getArtistForBand (searchFn, store, band) {
  function isSimilar (lhs, rhs) {
    return normalize(lhs) === normalize(rhs)
  }

  function removeSuffix (band) {
    return band.replace(/\W+\([[:upper:]]+\)/gi, '')
  }

  function findArtistInfo (artists) {
    const results = artists.filter(a => isSimilar(a.name, band))
      .filter(a => _.intersection(a.genres, commonGenres).length > 0)
      .map(a => _.pick(a, ['id', 'name', 'genres', 'images']))
    return _.first(results) || {}
  }

  return () => {
    return store.get(band).then(a => {
      if (a) {
        console.log('Found artist', band)
        return band
      } else {
        console.log('Searching for artist', band)
        return delayed(band, randomInt(5000))
          .then(removeSuffix)
          .then(b => searchFn(b, {limit: 10, market: 'SE'}))
          .then(findArtistInfo)
          .then(data => {
            return store.set(band, data)
          })
          .catch(console.debug)
      }
    })
  }
}

function createSearch (api, store) {
  const fn = a => api.searchArtists(a)
    .then(res => res.body.artists.items)
  return (artist) => getArtistForBand(fn, store, artist)
}

module.exports.fetch = (store, secrets) => (bandsPromise) => {
  const apiPromise = SpotifyApi.create(secrets.spotify)
  return Promise.all([apiPromise, bandsPromise]).then(x => {
    const [api, bands] = x
    const findArtist = createSearch(api, store)
    const results = bands.map(findArtist)
    return serial(results)
  })
}
