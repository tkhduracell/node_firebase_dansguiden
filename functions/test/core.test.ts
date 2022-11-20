import firebase from 'firebase-admin'
import chai from 'chai'
import { Versions, Events } from '../src/core'

chai.should()

class QueryMock<T> {
  data: T[]
  constructor(data: T[]) {
    this.data = data
  }

  from(): QueryMock<T> {return this}
  where(): QueryMock<T> {return this}
  orderBy(): QueryMock<T> {return this}
  limit(): QueryMock<T> {return this}
  get(): MockResult<T> {
    const datas = this.data.map(itm => {
      return { data: () => itm } as MockDoc<T>
    })
    return {
      forEach(fn: (itm: MockDoc<T>) => void) {
        datas.forEach(itm => fn(itm))
      }
    } as MockResult<T>
  }
}

type MockResult<T> = {
  forEach: (fn: (itm: MockDoc<T>) => void) => void;
}

type MockDoc<T> = {
  data: () => T;
}

type Col = firebase.firestore.CollectionReference

function silent (): void {}

describe('core.js', () => {

  describe('Versions', () => {
    it('fetch() should return data', async () => {
      const version = { name: "1.0.0" }
      const data = new QueryMock([version]) as unknown as Col
      const a = await Versions.fetch(() => data)

      expect(a).toHaveLength(1)
      expect(a).toStrictEqual([version])
    })
  })

  describe('Events', () => {
    it('fetch() should return data', async () => {
      const event = { event: true }
      const data = new QueryMock([event]) as unknown as Col

      const a = await Events.fetch(() => data, { from: 'a', to: 'b'}, () => silent)

      expect(a).toHaveLength(1)
      expect(a).toStrictEqual([event])
    })
  })
})
