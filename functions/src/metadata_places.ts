import { keyBy, omit, mapValues, pick, uniqBy, isUndefined, omitBy } from "lodash"
import { histogram } from "./lib/counter"
import { PlacessParser } from "./lib/danslogen/places"
import { PlacesApi } from "./lib/google/maps/places_api"
import { DanceEvent } from "./lib/types"
import { mergeWith } from "./lib/utils/utils"
import { PlaceApiOverrides } from "./overrides"

export class MetadataPlaces {
    static build(events: DanceEvent[], secerts: PlacesSecerts, existingKeys: string[] = []): MetadataPlacesRecordBuilder {
        return {
            counts: histogram('place')(events),
            general: placesInfo()(events),
            places_api: Promise.all([
                placesApiImage(secerts)(events, existingKeys),
                overrides()(events)
            ]).then(mergeWith)
        }
    }
}

export type MetadataPlacesRecordBuilder = {
    counts: Promise<Record<string, PlacesApi>>
    general?: Promise<Record<string, PlacesInfo>>
    places_api?: Promise<Record<string, PlacesApiInfo>>
}

export type MetadataPlacesRecord = {
    counts: PlacesApi
    general?: PlacesInfo
    places_api?: PlacesApiInfo
}

export type PlacesInfo = {
    website_url?: string,
    facebook_url?: string
} | Record<string, never>

function placesInfo(): (values: DanceEvent[]) => Promise<Record<string, PlacesInfo>> {
    return async (values: DanceEvent[]) => {
        const info = await PlacessParser.parse()
        const infoByName = keyBy(info, 'name')
        const groups = keyBy(values, 'place')
        return mapValues(groups, ({ place }) => {
            if (place in infoByName) {
                return omit(infoByName[place], 'region', 'city', 'county')
            }
            return {}
        })
    }
}

function blacklist<T, K>(valFn: (e: T) => K[], ...exclude: K[]): (e: T) => boolean {
    return (t: T) => !valFn(t).some(p => exclude.includes(p))
}

export type PlacesApiInfo = {
    id: string,
    name: string,
    address: string,
    photo_small: string,
    photo_large: string,
    photo_attributions: string[],
}

export type PlacesSecerts = { api_key: string }

function placesApiImage(secrets: PlacesSecerts): (values: DanceEvent[], existingKeys: string[]) => Promise<Record<string, PlacesApiInfo>> {
    return async (values: DanceEvent[], existingKeys: string[]) => {
        const places = values.map(e => pick(e, 'place', 'county', 'city', 'region'))

        const out: Record<string, PlacesApiInfo> = {}


        const uniqueKeys = uniqBy(places, p => p.place)
        const withoutOverrides = uniqueKeys.filter(p => p.place in PlaceApiOverrides)
        const newKeys = withoutOverrides.filter(p => !existingKeys.includes(p.place))


        console.log(`Places API input: 
            All keys: ${uniqueKeys.length}
            All w/o overrides: ${withoutOverrides.length}
            All w/o overrides + existing: ${newKeys.length}
        `.replace(/ {2,}/g, '\t').trim())

        const allTypes = new Set<string>();

        for (const { place, region } of newKeys) {

            const query = [place, region, 'Sverige'].join(', ')

            const candidates = await PlacesApi.search(secrets.api_key, query)

            candidates.forEach(c => c.types.forEach(t => allTypes.add(t)))

            const [first] = candidates.filter(blacklist(c => c.types, 'locality', 'transit_station'))
            if (first) {
                const photo = first.photos?.find(() => true)

                const result = omitBy({
                    id: first.place_id,
                    name: first.name,
                    address: first.formatted_address,
                    photo_small: photo ? PlacesApi.photoUrl(secrets.api_key, photo.photo_reference, '256') : undefined,
                    photo_large: photo ? PlacesApi.photoUrl(secrets.api_key, photo.photo_reference, '1024') : undefined,
                    photo_attributions: photo ? photo.html_attributions : undefined
                }, isUndefined) as PlacesApiInfo

                console.dir(result, { depth: 10, sorted: true })

                out[place] = result
            }

        }

        console.log('Places API all types seen', ...allTypes)

        return out
    }
}

export function overrides(): (values: DanceEvent[]) => Promise<Record<string, Partial<PlacesApiInfo>>> {
    return async (values: DanceEvent[]) => {
        const out: Record<string, Partial<PlacesApiInfo>> = {}
        for (const event of values) {
            if (event._id && event.place in PlaceApiOverrides) {
                out[event.place] = { ...PlaceApiOverrides[event.place] }
            }
        }
        return out
    }
}