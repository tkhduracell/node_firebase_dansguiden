const _ = require('lodash')
const SpotifyWebApi = require('spotify-web-api-node')
const secrets = require('../../.secrets.json');
const {
	delayed,
	serial
} = require('./promises');
const client = {
	id: secret.spotifyClientId,
	secret: secrets.spotifyClientSecret
}
const oauth2 = require('simple-oauth2').create({
	client,
	auth: {
		tokenHost: 'https://accounts.spotify.com',
		tokenPath: '/api/token'
	}
})

function createSpotifyApi(auth) {
	const spotifyApi = new SpotifyWebApi({
		clientId: client.id,
		clientSecret: client.secret
	})
	spotifyApi.setAccessToken(auth.token.access_token)
	return spotifyApi
}

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
const getFirst = x => _.first(x) || {};

function getArtistForBand(searchFn, store, band) {

	function getBandsFromArtists(artists) {
		return artists.filter(a => a.name.toLowerCase() === band.toLowerCase())
			.filter(a => _.intersection(a.genres, commonGenres).length > 0)
			.map(a => _.pick(a, ['id', 'name', 'genres', 'images']));
	}

	return () => {
		return store.get(band).then(a => {
			if (a) {
				console.log("Found artist", band)
				return Promise.resolve(a);
			} else {
				console.log("Searching for artist", band)
				return delayed(band, randomInt(5000))
					.then(b => b.replace(/\W+\([[:upper:]]+\)/g), '')
					.then(b => searchFn(b, {limit: 10, market: "SE"}))
					.then(res => res.body.artists.items)
					.then(getBandsFromArtists)
					.then(getFirst)
					.then(found => store.set(band, found))
			}
		})
	}
}

module.exports.lookup = (store) => (bands) => {
	const spotifyApi = oauth2.clientCredentials.getToken({})
		.then(oauth2.accessToken.create)
		.then(createSpotifyApi)

	return Promise.all([spotifyApi, bands])
		.then(arr => {
			const [api, bands] = arr
			const searchFn = api.searchArtists.bind(api);
			const bandSearches = bands.map(b => getArtistForBand(searchFn, store, b))
			return serial(bandSearches)
		})
}
