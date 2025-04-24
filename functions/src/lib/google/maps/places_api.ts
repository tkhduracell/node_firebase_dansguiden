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

import { v1 } from '@googlemaps/places'

const { PlacesClient } = v1

const basicKeys = ['places.displayName', 'places.id', 'places.formattedAddress', 'places.photos', 'places.types', 'places.googleMapsLinks', 'places.googleMapsUri', 'places.location', 'places.primaryType', 'places.types'] as const
type Key = typeof basicKeys[number]

const fieldMask = (...keys: Key[]) => ({
  otherArgs: { headers: { 'X-Goog-FieldMask': keys } }
} as const)

export class PlacesApi {

  static async search(apiKey: string, query: string): Promise<PlaceApiSearchCandidate[]> {
    console.log('Searching for', query, 'using Places API')
    const client = new PlacesClient({ key: apiKey })

    try {
      const [{ places }] = await client.searchText({ textQuery: query, languageCode: 'sv', regionCode: 'sv', includedType: '' }, fieldMask(...basicKeys))

      const out = places?.map(({ displayName, formattedAddress, photos, id, types }) => ({
        formatted_address: formattedAddress ?? '',
        name: displayName?.text ?? '',
        place_id: id ?? '',
        photos: photos?.map(({ authorAttributions, name, heightPx, widthPx }) => ({
          photo_reference: name ?? '',
          height: heightPx ?? 0,
          width: widthPx ?? 0,
          html_attributions: authorAttributions?.map(({ displayName, photoUri, uri }) => `<a href="${uri}">©${displayName}</a>`) ?? []
        })) ?? [],
        types: types ?? [],
      })) ?? []

      return out
    } catch (err) {
      console.error('Places API error', err)
      if (err instanceof Error && 'statusDetails' in err) {
        console.dir(err.statusDetails, { depth: 10, sorted: true })
      }
    }
    return []
  }

  static photoUrl(apiKey: string, ref?: string, size = '512') {
    const param = new URLSearchParams({
      maxHeight: size,
      maxWidth: size,
      key: apiKey
    })
    return `https://places.googleapis.com/v1/${ref}/media?${param.toString()}`
  }
}
