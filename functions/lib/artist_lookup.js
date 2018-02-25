const _ = require('lodash')
const SpotifyWebApi = require('spotify-web-api-node')
const secrets = require('../../.secrets.json');
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

const delayed = (value, duration) => {
	return function() {
		return new Promise(function(resolve, reject) {
			setTimeout(() => resolve(value), duration)
		});
	};
}

const serial = (funcs) => {
	return funcs.reduce((promise, func) => {
		return promise.then(result => func().then(Array.prototype.concat.bind(result)))
	}, Promise.resolve([]))
}

function createSpotifyApi(auth) {
	const spotifyApi = new SpotifyWebApi({
		clientId: client.id,
		clientSecret: client.secret
	})
	spotifyApi.setAccessToken(auth.token.access_token)
	return spotifyApi
}

const common_genres = [
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

function getArtistForBand(searchFn, store, band) {
	return () => {
		return store.get(band).then(a => {
			if (a) {
				console.log("Found artist", band)
				return Promise.resolve(a);
			} else {
				console.log("Searching for artist", band)
				return Promise.resolve()
					.then(delayed(band, 500))
					.then(b => b.replace(/\W+\([[:upper:]]+\)/g), '')
					.then(b => searchFn(b, {limit: 10, market: "SE"}))
					.then(res => res.body.artists.items)
					.then(artists => {
						return artists.filter(a => a.name.toLowerCase() === band.toLowerCase() )
							.filter(a => _.intersection(a.genres, common_genres).length > 0)
							.map(a => _.pick(a, ['id', 'name', 'genres', 'images']))
					})
					.then(x => _.first(x) || {})
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
