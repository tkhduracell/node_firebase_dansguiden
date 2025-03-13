export type PlacesApiResponse = {
  candidates: PlaceApiSearchCandidate[]
  error_message: string,
  status: 'OK' | 'INVALID_REQUEST',
}

export type PlaceApiSearchCandidate = {
  formatted_address: string
  name: string
  photos: PlaceApiPhoto[]
  types: string[],
  place_id: string,
}

export type PlaceApiPhoto = {
  height: number
  width: number
  html_attributions: string[]
  photo_reference: string
}

const BASE_URL = 'https://maps.googleapis.com/maps/api/place'

export class PlacesApi {

  static async search(apiKey: string, query: string) {
    console.log('Searching for', query, 'using Places API')
    const response = await fetch(PlacesApi.searchUrl(apiKey, query))

    if (response.ok) {
      const { candidates, status, error_message } = await response.json() as PlacesApiResponse
      if (error_message) {
        console.error('Places API returned error', { status, error_message })
      } else {
        return candidates ?? []
      }
    } else {
      console.error('Places API response', `'${query}'`, '==>',
        'ok?:', response.ok,
        'code:', response.status,
        'message', response.statusText,
      )
    }
    return []
  }

  static searchUrl(apiKey: string, query: string) {
    const params = new URLSearchParams()
    params.append('fields', 'name,place_id,formatted_address,photos,types')
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
