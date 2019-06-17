/* eslint-env mocha */
const events = require('../lib/events')
const chai = require('chai')
const cheerio = require('cheerio')
const moment = require('moment')

chai.should()
chai.use(require('chai-match'))
// node_modules/.bin/mocha --reporter spec functions/lib/events.test.js

describe('events', () => {
  describe('.parse', () => {
    var subject = []
    before(async () => {
      subject = await events.parse(() => {})
    })

    it('should return none empty array', async () => {
      subject.should.have.length.greaterThan(1)
    })

    it('should return have no unknowns', async () => {
      const output = subject.filter(e => e.type === 'unknown')
      output.should.have.length(0)
    })

    it('should only have proper weekdays', async () => {
      const output = subject.filter(e => e.type !== 'unknown').map(d => d.data.weekday)
      const weekdays = Array.from(new Set(output).values())
      weekdays.should.have.members(['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'])
    })

    it('should only have proper dates', async () => {
      const output = subject.filter(e => e.type === 'event').map(d => d.data.date)
      const startofMonth = moment().startOf('month')
      output.forEach(date => date.isValid().should.be.true)
      output.forEach(date => date.isSameOrAfter(startofMonth).should.be.true)
    })

    it('should only have proper HH.mm-HH.mm', async () => {
      const output = subject.filter(e => e.type === 'event').map(d => d.data)
      output.filter(e => e.time).forEach(e => e.time.should.match(/\d{2}\.\d{2}(-\d{2}\.\d{2})?/))
    })
  })

  describe('.asDatabaseColumns', () => {
    const $ = cheerio.load(`<table><tr>
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
      const expected = ['weekday', 'date', 'time', 'band', 'place', 'city', '', 'county', 'region', 'extra']
      events.asDatabaseColumns($, $('tr').first()).should.eql(expected)
    })
  })

  describe('.asEntry', () => {
    const $ = cheerio.load(`
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
        'county': 'Umeå',
        'band': 'Highlights',
        'city': 'Ersboda',
        'region': 'Västerbotten',
        'date': '28',
        'place': 'Folkets Hus Ersboda',
        'extra': '>',
        'time': '21.00-01.00',
        'weekday': 'Fre'}
      events.asEntry($, $('tr'),
        ['weekday', 'date', 'time', 'band', 'place', 'city', 'county', 'region', 'extra']
      ).should.eql(expected)
    })
  })
})
