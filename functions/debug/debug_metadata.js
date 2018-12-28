const secrets = require('../../.secrets.json')
const artistUpdater = require('../lib/artist_updater')

const admin = require('firebase-admin')

admin.initializeApp({
  credential: admin.credential.cert(require(secrets.defaultCredentials)),
  databaseURL: secrets.databaseURL
})

const db = admin.firestore()
db.settings({timestampsInSnapshots: true})

const table = (name) => db.collection(name)
const log = (str) => console.log('log:', str)
const batch = () => {
  return {
    update: (doc, update) => {
      console.log('update', update)
    },
    commit: () => Promise.resolve({})
  }
}

artistUpdater.update(batch, table, log)
  .then(output => {
    console.log(JSON.stringify(output, null, 2))
  })
  .catch(error => console.error(error))
