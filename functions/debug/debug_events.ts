import { parse } from '../lib/events'

parse(console.log)
  .then((res) => {
    console.log('------------------------------------')
    return res.filter(e => e.data.date === '2019-03-06')
      .forEach(e => {
        console.log(JSON.stringify(e, undefined, 2))
      })
  })
  .catch(console.error)
