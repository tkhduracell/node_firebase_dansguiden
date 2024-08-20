import { load } from 'cheerio'
import { asDatabaseColumns, asEntry, asObject, pipeline } from '../src/lib/danslogen/events'
import { DanceEvent } from '../src/lib/types'

describe('EventsParser', () => {
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
      expect(asDatabaseColumns($, $('tr').first())).toStrictEqual(expected)
    })
  })

  describe('.asObject', () => {
    function parse(data: string) {
      const $ = load(data)
      return asObject<DanceEvent>($, $('tr'), [
        'weekday', 'date', 'time', 'band', 'place', 'city', 'county', 'region', 'extra'
      ])
    }

    it('should parse row', () => {
      const event = parse(`
      <table><tr>
        <td>Fre</td><td>28</td>
        <td>21.00-01.00</td>
        <td>Highlights</td>
        <td>Folkets Hus Ersboda</td>
        <td>Ersboda</td>
        <td>Ume&#xE5;</td>
        <td>V&#xE4;sterbotten</td>
        <td>&gt;</td>
      </tr></table>
      `)

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
      expect(event).toStrictEqual(expected)
    })
  })
  describe('pipeline', () => {
    function parse(data: string) {
      const $ = load(data)
      return $('tr').toArray().map(elm => asEntry($, elm as cheerio.TagElement, 'December 2022', [
        'weekday', 'date', 'time', 'band', 'place', 'city', 'county', 'region', 'extra'
      ]))
    }

    it('should classify vikings as boat', () => {
      const e = parse(`
        <table>
          <tr>
            <td>Tor</td>
            <td>1</td>
            <td>21.00-01.00</td>
            <td>Highlights</td>
            <td>Viking Grace</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>PRO</td>
          </tr>
          <tr>
            <td>Tor</td>
            <td>1</td>
            <td>21.00-01.00</td>
            <td>Highlights</td>
            <td>Folkets Hus Grace</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>PRO</td>
          </tr>
        </table>
      `)

      const [e1, e2] = pipeline(e)

      expect(e1.data.region).toStrictEqual('Stockholm (Båt)')
      expect(e2.data.region).toStrictEqual('Stockholm')
    })

    it('remove > in extra', () => {
      const e = parse(`
        <table>
          <tr>
            <td>Tor</td>
            <td>1</td>
            <td>21.00-01.00</td>
            <td>Highlights</td>
            <td>Viking Grace</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>Stockholm</td>
            <td>&gt;</td>
          </tr>
        </table>
      `)

      const [e1] = pipeline(e)

      expect(e1.data.extra).toStrictEqual('')
    })
  })
})
