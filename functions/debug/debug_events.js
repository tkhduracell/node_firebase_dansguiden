const fs = require('fs')
const events = require('../lib/events')

events.update(console.log).then((res) => {
  console.log('result')
  console.log(JSON.stringify(res, undefined, 2))
  fs.writeFileSync('output.json', JSON.stringify(res, undefined, 2))
})
