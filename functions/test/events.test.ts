import { should, assert } from 'chai'
import { load } from 'cheerio'
import moment from 'moment'
import 'mocha'

should()

import { parse, asDatabaseColumns, asEntry } from '../lib/events'
import { InternalDanceEvent } from '../src/core'
import { DanceEvent } from '../lib/types'
import _ from 'lodash'

describe('events', () => {
  describe('.parse (live data validation)', () => {
    let subject = [] as InternalDanceEvent[]
    before(async () => {
      try {
        subject = await parse(() => {})
      } catch (error) {
        assert.fail("Unable to fetch real data, check your internet connection")
      }
    })

    it('should return none empty array', () => {
      subject.should.have.length.greaterThan(1)
    })

    it('should return have no unknowns', () => {
      const output = subject.filter(e => e.type === 'unknown')
      output.should.have.length(0)
    })

    it('should return have no null values', () => {
      const output = subject.filter(e => e.type !== 'unknown')
        .map(e => e.data)
      output.forEach(e => {
        _.forEach(e, v => should().exist(v))
      })
    })

    it('should only have proper weekdays', () => {
      const output = subject.filter(e => e.type !== 'unknown').map(d => d.data.weekday)
      const weekdays = Array.from(new Set(output).values())
      weekdays.should.have.members(['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'])
    })

    it('should only have proper dates', () => {
      const output = subject.filter(e => e.type === 'event').map(d => d.data.date)
      const startofMonth = moment.utc().startOf('month')
      output.forEach(date => {
        moment(date).isValid().should.be.true
        moment(date).isSameOrAfter(startofMonth).should.be.true
      })
    })

    it('should only have proper HH.mm-HH.mm', () => {
      const output = subject.filter(e => e.type === 'event')
      const times = output.filter(e => e.data.time)

      times.forEach(e => {
        e.data.time.should.match(/^\d{2}:\d{2}(-\d{2}:\d{2})?$/)
      })
    })
  })

  describe('.asDatabaseColumns', () => {
    const $ = load(`<table><tr>
      <th colspan="2">Datum</th>
      <th style="width: 75px;">Tid</th>
      <th style="width: 150px;">
      <img style="padding: 0 5px 2px 0;" src="/img/layout/searcharrowright.gif" alt="">
      <a>Dansband</a>
      </th>
          <th style="width: 125px;">
      <img style="padding: 0 5px 2px 0;" src="/img/layout/searcharrowup.gif" alt="">
      <a>Dansst&#xE4;lle</a>
      </th>
          <th style="width: 90px;">
      <img style="padding: 0 5px 2px 0;" src="/img/layout/searcharrowright.gif" alt="">
      <a>Ort</a>
      </th>
      <th></th>
      <th style="width: 80px;">
      <img style="padding: 0 5px 2px 0;" src="/img/layout/searcharrowright.gif" alt="">
      <a>Kommun</a>
      </th>
          <th style="width: 89px;">
      <img style="padding: 0 5px 2px 0;" src="/img/layout/searcharrowright.gif" alt="">
      <a>L&#xE4;n</a>
      </th>
      <th style="width: 40px;">&#xD6;vrigt</th>
    </tr></table>`)

    it('should parse row', () => {
      const expected = [
        'weekday', 'date', 'time', 'band', 'place', 'city', '', 'county', 'region', 'extra'
      ]
      asDatabaseColumns($, $('tr').first()).should.eql(expected)
    })
  })

  describe('.asEntry', () => {
    const $ = load(`
    <table><tr>
      <td>Fre</td><td>28</td>
      <td>21.00-01.00</td>
      <td>Highlights</td>
      <td>Folkets Hus Ersboda</td>
      <td>Ersboda</td>
      <td>Ume&#xE5;</td>
      <td>V&#xE4;sterbotten</td>
      <td>&gt;</td>
    <tr></table>
    `)

    it('should parse row', () => {
      const expected = {
        county: 'Umeå',
        band: 'Highlights',
        city: 'Ersboda',
        region: 'Västerbotten',
        date: '28',
        place: 'Folkets Hus Ersboda',
        extra: '>',
        time: '21.00-01.00',
        weekday: 'Fre'
      } as DanceEvent
      asEntry<DanceEvent>($, $('tr'),
        ['weekday', 'date', 'time', 'band', 'place', 'city', 'county', 'region', 'extra']
      ).should.eql(expected)
    })
  })
})
