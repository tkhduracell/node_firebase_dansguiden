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

	function isSimilar(lhs, rhs) {
		const normalize = str => str.toLowerCase().replace(/[^\wåäö]+/gi, '')
		return normalize(lhs) === normalize(rhs);
	}

	function removeSuffix(band) {
		return band.replace(/\W+\([[:upper:]]+\)/gi, '')
	}

	function getBandsFromArtists(artists) {
		return artists.filter(a => isSimilar(a.name, band))
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
					.then(removeSuffix)
					.then(b => searchFn(b, {limit: 10, market: "SE"}))
					.then(res => res.body.artists.items)
					.then(getBandsFromArtists)
					.then(getFirst)
					.then(store.set.bind(store, band))
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
