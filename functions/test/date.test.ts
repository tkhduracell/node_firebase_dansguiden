import moment from 'moment'

import { parseYearDate, fixTime } from '../lib/date'

describe('date.ts', () => {
  describe('parseYearDate()', () => {

    it('should return same year when not specified', () => {
      const year = moment().year()
      const date = parseYearDate('Januari', '1')

      expect(date.format('YYYY-MM-DD')).toStrictEqual(year + '-01-01')
    })

    it('should return year as specified', () => {
      const date = parseYearDate('Januari 2015', '1')

      expect(date.format('YYYY-MM-DD')).toStrictEqual('2015-01-01')
    })

    it('should be invalid date if no match', () => {
      const date = parseYearDate('2015 Feb', '1')

      expect(date.isValid()).toStrictEqual(false)
    })
  })

  describe('fixTime()', () => {
    it('should correct a timestamp', () => {
      expect(fixTime("12.00")).toStrictEqual("12:00")
      expect(fixTime("12:00")).toStrictEqual("12:00")
      expect(fixTime("12,00")).toStrictEqual("12:00")
    })

    it('should correct between timestamps', () => {
      expect(fixTime("12:00-20:00")).toStrictEqual("12:00-20:00")
      expect(fixTime("12:00.20:00")).toStrictEqual("12:00-20:00")
      expect(fixTime("12:00,20:00")).toStrictEqual("12:00-20:00")
    })

    it('should remove whitespaces', () => {
      expect(fixTime("12 : 00-20 :00")).toStrictEqual("12:00-20:00")
      expect(fixTime("12:00   -  20:00")).toStrictEqual("12:00-20:00")
    })
  })
})
