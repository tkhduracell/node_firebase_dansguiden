import moment from 'moment'
import chai from 'chai'
import 'mocha'

chai.should()

import { parseYearDate, fixTime } from '../lib/date'

describe('date.ts', () => {
  context('parseYearDate()', () => {

    it('should return same year when not specified', () => {
      const year = moment().year()
      const date = parseYearDate('Januari', '1')

      date.format('YYYY-MM-DD').should.equal(year + '-01-01')
    })

    it('should return year as specified', () => {
      const date = parseYearDate('Januari 2015', '1')

      date.format('YYYY-MM-DD').should.equal('2015-01-01')
    })

    it('should be invalid date if no match', () => {
      const date = parseYearDate('2015 Feb', '1')

      date.isValid().should.equal(false)
    })
  })

  context('fixTime()', () => {
    it('should correct a timestamp', () => {
      fixTime("12.00").should.equal("12:00")
      fixTime("12:00").should.equal("12:00")
      fixTime("12,00").should.equal("12:00")
    })

    it('should correct between timestamps', () => {
      fixTime("12:00-20:00").should.equal("12:00-20:00")
      fixTime("12:00.20:00").should.equal("12:00-20:00")
      fixTime("12:00,20:00").should.equal("12:00-20:00")
    })

    it('should remove whitespaces', () => {
      fixTime("12 : 00-20 :00").should.equal("12:00-20:00")
      fixTime("12:00   -  20:00").should.equal("12:00-20:00")
    })
  })
})
