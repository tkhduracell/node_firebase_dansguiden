const fs = require('fs')
const out = require('./events').update(console.log)

console.log("out", out)
out.then(res => {
	console.log("then:", res)
	fs.writeFileSync('output.json', JSON.stringify(res, undefined, 2))
})
