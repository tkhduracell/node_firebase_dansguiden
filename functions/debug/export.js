const secrets = require('../../.secrets.json');
const dumper = require('../lib/dump');
const admin = require("firebase-admin");
const fs = require('fs');

admin.initializeApp({
	credential: admin.credential.cert(require(secrets.defaultCredentials)),
	databaseURL: secrets.databaseURL
});

const save = dumper.dump(admin.firestore(), "../../backups");

save("events")
save("versions")
save("images")
