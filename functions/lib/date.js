const moment = require('moment')

const months = {
  'januari': 1,
  'februari': 2,
  'mars': 3,
  'april': 4,
  'maj': 5,
  'juni': 6,
  'juli': 7,
  'augusti': 8,
  'september': 9,
  'oktober': 10,
  'november': 11,
  'december': 12
}

const weekdays = {
  'Mån': 1,
  'Tis': 2,
  'Ons': 3,
  'Tor': 4,
  'Fre': 5,
  'Lör': 6,
  'Sön': 7
}

const isMonthYear = /(\w+)\s+(20\d\d)/gi
const isMonth = /(\w+)/gi

module.exports.parseYearDate = function parseYearDate (monthYearStringDirty, dateString, log) {
  const date = parseInt(dateString.trim())
  const monthYear = monthYearStringDirty.trim().toLowerCase()
  if (monthYear.match(isMonthYear) !== null) {
    const [monthStr, yearStr] = monthYear.split(/\s+/, 2)
    const month = months[monthStr] - 1
    const year = parseInt(yearStr)
    return moment({ year, month, date })
  }
  if (monthYear.match(isMonth) !== null) {
    const year = moment().year()
    const month = months[monthYear] - 1
    return moment({ year, month, date })
  }
  return moment.invalid()
}

module.exports.validateWeekDay = function validateWeekDay (momentDate, weekday, data, log) {
  const tableWeekday = weekdays[weekday]

  const dateStr = momentDate.format()
  const dateWeekdayNbr = momentDate.isoWeekday()

  if (dateWeekdayNbr !== tableWeekday) {
    log(`Weekday check failed, ${weekday} (dateNo ${tableWeekday}) is not correct on ${dateStr} which is dayNo ${dateWeekdayNbr}`)
    log(data)
  }
}

module.exports.validateDate = (date, log) => {
  if (!date.isValid()) {
    log(`Invalid date: ${date}`)
  }
}
