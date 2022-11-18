import moment from 'moment'
import { parse } from '../lib/events'

parse(console.log, ['januari'])
  .then((res) => {
    console.log('------------------------------------')
    return res.filter(e => e.data.date > moment().format('YYYY-MM-DD'))
      .forEach(e => {
        console.log(JSON.stringify(e, undefined, 2))
      })
  })
  .catch(console.error)
