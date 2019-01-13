const admin = require('firebase-admin')
const secrets = require('../../.secrets')

module.exports = () => {
  if (process.env.FIREBASE_CONFIG) {
    admin.initializeApp()
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(require(secrets.defaultCredentials)),
      databaseURL: secrets.databaseURL
    })
  }
  const db = admin.firestore()
  db.settings({timestampsInSnapshots: true})

  const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}')
  return {
    table: (name) => db.collection((config.collection_prefix || '') + name),
    batch: () => db.batch()
  }
}
