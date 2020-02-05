import moment from 'moment'
import chai from 'chai'

chai.should()

import { parseYearDate } from '../lib/date'

describe('parseYearDate', () => {
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
