import _ from "lodash"
import { histogram } from "./lib/counter"
import { PlacessParser } from "./lib/danslogen/places"
import { PlacesApi } from "./lib/google/maps/places_api"
import { DanceEvent } from "./lib/types"

export type MetadataPlacesRecord = {
    counts: Promise<Record<string, PlacesApi>>
    general: Promise<Record<string, PlacesInfo>>
    places_api: Promise<Record<string, PlacesApiInfo>>
}

type PlacesInfo = {
    website_url?: string,
    facebook_url?: string
} | Record<string, never>

function placesInfo(): (values: DanceEvent[]) => Promise<Record<string, PlacesInfo>> {
    return async (values: DanceEvent[]) => {
        const info = await PlacessParser.parse()
        const infoByName = _.keyBy(info, 'name')
        const groups = _.keyBy(values, 'place')
        return _.mapValues(groups, ({ place }) => {
            if (place in infoByName) {
                return _.omit(infoByName[place], 'region', 'city', 'county')
            }
            return {}
        })
    }
}

function blacklist<T, K>(valFn: (e: T) => K[], ...exclude: K[]): (e: T) => boolean {
    return (t: T) => !valFn(t).some(p => exclude.includes(p))
}

type PlacesApiInfo = {
    id: string,
    name: string,
    address: string,
    photo_small: string,
    photo_large: string,
    photo_attributions: string[],
}

export type PlacesSecerts = { api_key: string }

function placesApiImage(secrets: PlacesSecerts): (values: DanceEvent[]) => Promise<Record<string, PlacesApiInfo>> {
    return async (values: DanceEvent[]) => {
        const places = values.map(e => _.pick(e, 'place', 'county', 'city', 'region'))

        const out: Record<string, PlacesApiInfo> = {}
        for (const { place, region } of _.uniqBy(places, p => p.place)) {

            const query = [place, region, 'Sverige'].join(', ')

            const candidates = await PlacesApi.search(secrets.api_key, query)

            const [first] = candidates.filter(blacklist(c => c.types, 'locality'))
            if (first) {
                const photo = first.photos?.find(() => true)

                out[place] = _.omitBy({
                    id: first.place_id,
                    name: first.name,
                    address: first.formatted_address,
                    photo_small: photo ? PlacesApi.photoUrl(secrets.api_key, photo.photo_reference, '128') : undefined,
                    photo_large: photo ? PlacesApi.photoUrl(secrets.api_key, photo.photo_reference, '512') : undefined,
                    photo_attributions: photo ? photo.html_attributions : undefined
                }, _.isUndefined) as PlacesApiInfo
            }

        }
        return out
    }
}

export class MetadataPlaces {
    static build(events: DanceEvent[], secerts: PlacesSecerts): MetadataPlacesRecord {
        return {
            counts: histogram('place')(events),
            general: placesInfo()(events),
            places_api: placesApiImage(secerts)(events),
        }
    }
}