const fs = require('fs')
const out = require('../lib/events').update(console.log)

out.then((res) => {
  console.log('result')
  console.log(JSON.stringify(res, undefined, 2))
  fs.writeFileSync('output.json', JSON.stringify(res, undefined, 2))
})
