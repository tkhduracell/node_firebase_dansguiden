import moment from 'moment'
import { LogFn } from './log'
import _ from 'lodash'

moment.updateLocale('sv', {
  weekdays: ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"],
  weekdaysShort: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
  months: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
})

export function fixTime(time: string): string {
  if (_.isString(time)) {
    return time.replace(/(\d{2})\s*[:. ,]\s*(\d{2})/g, '$1:$2')
      .replace(/(\d{2}:\d{2})\s*[-,. ]\s*(\d{2}:\d{2})/g, '$1-$2')
  } else {
    return time
  }
}

export function parseYearDate(monthYear: string, dateString: string): moment.Moment {
  const dt = moment.utc(monthYear.trim(), ["MMMM YYYY", "MMMM"], 'sv', true)
  dt.date(parseInt(dateString))
  return dt
}

export function validateWeekDay (date: string, weekday: string, log: LogFn): boolean {
  const _date = moment.utc(date)
  const realWeekday = _date.format('ddd')

  if (weekday !== realWeekday) {
    log(`
      Warning: Weekday check failed, table says '${weekday}' but ${date} is a '${_date.format('ddd')}'
    `.trim())
    return false
  }
  return true
}

export function validateDate(date: string, log: LogFn): boolean {
  if (!moment.utc(date).isValid()) {
    log(`Invalid date: ${date}`)
    return false
  }
  return true
}
