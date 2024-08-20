import moment, { Moment } from 'moment'
import _ from 'lodash'

moment.updateLocale('sv', {
  weekdays: ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"],
  weekdaysShort: ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"],
  months: ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December']
})

export function month(date: Moment, locale = 'sv'): string {
  return date.locale(locale).format('MMMM')
}

export function fixTime(time: string): string {
  if (_.isString(time)) {
    const fixed = time.replace(/(\d{2})\s*[:. ,]\s*(\d{2})/g, '$1:$2')
      .replace(/(\d{2}:\d{2})\s*[-,. ]\s*(\d{2}:\d{2})/g, '$1-$2')

    // If we do not match still, then trash
    return fixed.match(/^\d{2}:\d{2}(-\d{2}:\d{2})?$/) ? fixed : ''
  } else {
    return time
  }
}

export function parseYearDate(monthYear: string, dateString: string): moment.Moment {
  const dt = moment.utc(monthYear.trim(), ["MMMM YYYY", "MMMM"], 'sv', true)
  dt.date(parseInt(dateString))
  return dt
}

export function validateWeekDay (date: string, weekday: string): boolean {
  const _date = moment.utc(date)
  const realWeekday = _date.format('ddd')

  if (weekday !== realWeekday) {
    console.warn(
      'Invalid weekday, actual', weekday,
      'expected', date, 'to be', _date.format('ddd')
    )
    return false
  }
  return true
}

export function validateDate(date: string): boolean {
  if (!moment.utc(date, false).isValid()) {
    console.warn('Invalid date', date)
    return false
  }
  return true
}
