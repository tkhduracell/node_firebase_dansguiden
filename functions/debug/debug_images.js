const secrets = require('../../.secrets.json');
const store = require('../lib/store');
const artistLookup = require('../lib/artist_lookup');
const admin = require("firebase-admin");
const fs = require('fs');

admin.initializeApp({
	credential: admin.credential.cert(require(secrets.defaultCredentials)),
	databaseURL: secrets.databaseURL
});

const database = admin.firestore();
const cache = {
	set: (k,v) => store.saveBandMetadata(database, k, v),
	get: (k) => store.loadBandMetadata(database, k)
}

const bandRefs = store.getBandRefs(database);
const bands = bandRefs.then(Object.keys)

artistLookup.lookup(cache)(bands)
	.then(output => {
		console.log(JSON.stringify(output, null, 2))
	})
	.catch(error => {
		console.error(error)
	})
