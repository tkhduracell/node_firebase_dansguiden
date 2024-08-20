import moment from 'moment'
import { EventsParser } from '../src/lib/danslogen/events'

EventsParser.parse(['november'])
  .then((res) => {
    console.log('------------------------------------')
    return res.filter(e => e.data.date > moment().format('YYYY-MM-DD'))
      .slice(0, 5)
      .forEach(e => {
        console.log(JSON.stringify(e, undefined, 2))
      })
  })
  .catch(console.error)
