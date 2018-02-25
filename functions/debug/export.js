const secrets = require('../../.secrets.json');
const dumper = require('../lib/dumper');
const admin = require("firebase-admin");
const path = require('path');

admin.initializeApp({
	credential: admin.credential.cert(require(secrets.defaultCredentials)),
	databaseURL: secrets.databaseURL
});

const database = admin.firestore();
const save = dumper.dump(database, path.join(__dirname, "../../backups"))

save("events")
save("versions")
save("images")
save("band_metadata")
