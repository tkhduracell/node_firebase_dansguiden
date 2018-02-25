const secrets = require('../../.secrets.json')
const store = require('../lib/store')
const artistUpdater = require('../lib/artist_updater')
const admin = require("firebase-admin")
const fs = require('fs')

admin.initializeApp({
	credential: admin.credential.cert(require(secrets.defaultCredentials)),
	databaseURL: secrets.databaseURL
})

const database = admin.firestore()

artistUpdater.update(database)
	.then(output => {
		console.log(JSON.stringify(output, null, 2))
	})
	.catch(error => {
		console.error(error)
	})
