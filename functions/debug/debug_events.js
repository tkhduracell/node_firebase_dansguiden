const events = require('../lib/events')

events.parse(console.log)
  .then((res) => {
    console.log('------------------------------------')
    res.filter(e => e.date === '2019-03-06')
      .forEach(e => {
        console.log(JSON.stringify(e, undefined, 2))
      })
  })
  .catch(console.error)
