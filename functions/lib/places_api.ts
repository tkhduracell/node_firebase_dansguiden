import fetch from 'node-fetch'


export type PlacesApiResponse = {
  candidates: PlaceApiSearchCandidate[]
  status: "OK"
}

export type PlaceApiSearchCandidate = {
  formatted_address: string
  name: string
  photos: PlaceApiPhoto[]
  types: string[],
  website?: string,
  place_id: string,
  url: string
}

export type PlaceApiPhoto = {
  height: number
  html_attributions: string[]
  photo_reference: string
  width: number
}

const BASE_URL = 'https://maps.googleapis.com/maps/api/place'

export class PlacesApi {

  static async search(apiKey: string, query: string) {
    const response = await fetch(PlacesApi.searchUrl(apiKey, query))
    console.debug('Places API response', `'${query}'`,
      'ok:', response.ok,
      'code:', response.status,
      'message', response.statusText,
    )
    if (response.ok) {
      const { candidates } = await response.json() as PlacesApiResponse
      return candidates ?? []
    }
    return []
  }

  static searchUrl(apiKey: string, query: string) {
    const params = new URLSearchParams()
    params.append('fields', 'name,url,website,place_id,formatted_address,photos,types')
    params.append('key', apiKey)
    params.append('input', query)
    params.append('inputtype', 'textquery')
    params.append('language', 'sv')
    return `${BASE_URL}/findplacefromtext/json?${params.toString()}`
  }

  static photoUrl(apiKey: string, ref?: string, size = '512') {
    const param = new URLSearchParams()
    param.append('photo_reference', ref ?? '')
    param.append('maxheight', size)
    param.append('maxwith', size)
    param.append('key', apiKey)
    return `${BASE_URL}/photo?${param.toString()}`
  }
}
