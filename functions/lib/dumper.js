const fs = require('fs')
const {snapshotAsObj} = require('../lib/fn_helpers')

module.exports.dump = (table, dir) => (tableName) => {
  var data = {}
  data[tableName] = {}

  table(tableName)
    .get()
    .then(snapshot => {
      data[tableName] = snapshotAsObj(snapshot)
      return data
    })
    .catch(error => console.error(error))
    .then(dt => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir)
      const file = dir + '/' + tableName + '-export.json'
      fs.writeFile(file, JSON.stringify(dt), function (err) {
        if (err) return console.log(err)
        console.log('The file was saved! ' + file)
      })
    })
}
