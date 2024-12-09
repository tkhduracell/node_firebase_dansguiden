import _ from "lodash"
import { Histogram, histogram } from "./lib/counter"
import { DanceEvent } from "./lib/types"
import { Bands } from "./lib/spotify"
import { mapValues } from 'lodash'

type SpotifyInfo = {
    id?: string,
    name?: string,
    image_small?: string
    image_large?: string
}

type Override = Pick<SpotifyInfo, 'image_large' | 'image_small' | 'name' | 'id'>

export type MetadataBandsRecordBuilder = {
    counts: Promise<Record<string, Histogram>>,
    spotify?: Promise<Record<string, SpotifyInfo>>
    override?: Promise<Record<string, Override>>
}

export type MetadataBandsRecord = {
    counts: Histogram,
    spotify?: SpotifyInfo,
    override?: Override,
}

export type SpotifySecrets = { client_id: string; client_secret: string }

function spotifyApi(secrets: SpotifySecrets): (values: DanceEvent[]) => Promise<Record<string, SpotifyInfo>> {
    return async (values: DanceEvent[]) => {
        const bands = values.map(e => _.pick(e, 'band'))

        const out: Record<string, SpotifyInfo> = {}
        for (const { band } of _.uniqBy(bands, p => p.band)) {
            const { id, name, images } = await Bands.getArtist(secrets, band) ?? {}
            out[band] = _.omitBy({
                id: id,
                name: name,
                image_small: _.minBy(images, i => Math.abs(64 - (i.width ?? Number.MAX_VALUE)))?.url,
                image_large: _.minBy(images, i => Math.abs(640 - (i.width ?? Number.MAX_VALUE)))?.url
            }, _.isUndefined)
            await new Promise((resolve) => setTimeout(resolve, 500))
        }
        return out
    }
}

export class MetadataBands {
    static build(events: DanceEvent[], secrets: SpotifySecrets): MetadataBandsRecordBuilder {
        return {
            counts: histogram('band')(events),
            spotify: Promise.all([
                spotifyApi(secrets)(events),
                overrides()(events)
            ]).then(([artist, o]) => {
                const out = { ...artist }
                for (const [k,] of Object.entries(o)) {
                    out[k] = { ...artist[k], ...o[k] }
                }
                return out
            })
        }
    }
}

const overridesMap: Record<string, Override> = mapValues({
    'C-laget': { id: '', dir: 'media/c_laget' },
    'Caspers': { id: '', dir: 'media/caspers' },
    'Charlies': { id: '', dir: 'media/charlies' },
    'Eklöfs': { id: '', dir: 'media/ekl_fs' },
    'Glads': { id: '', dir: 'media/glads' },
    'Hanes Duo': { id: '', dir: 'media/hanes_duo' },
    'Hardys': { id: '', dir: 'media/hardys' },
    'Janne Stefans': { id: '', dir: 'media/janne_stefans' },
    'Jompaz': { id: '', dir: 'media/junix' },
    'Junix': { id: '', dir: 'media/junix' },
    'Kenneth & Classe': { id: '', dir: 'media/kenneth___classe' },
    'Kjellez': { id: '', dir: 'media/kjellez' },
    'Lövgrens': { id: '', dir: 'media/l_vgrens' },
    'Ola & Jag': { id: '', dir: 'media/ola___jag' },
    'Pär Norlings': { id: '', dir: 'media/p_r_norlings' },
    'Remix': { id: '', dir: 'media/remix' },
    'Rent Drag': { id: '', dir: '/media/rent_drag' },
    'Streaks': { id: '', dir: 'media/streaks' },
    'Strike': { id: '', dir: 'media/strike' },
    'Sture Johansson': { id: '', dir: 'media/sture_johansson' },
    'Tomas & Co': { id: '', dir: 'media/tomas___co' },
    'Tottes': { id: '', dir: 'media/tottes' },
    'Trippix': { id: '', dir: 'media/trippix' },
    'Trippz': { id: '', dir: 'media/trippz' },
    'Wåxbos': { id: '', dir: 'media/w_xbos' },
    'Höilands': { id: '', dir: 'media/h_ilands' },
    // With ids
    'Highlights': {
        id: '2tgdbXtsDz4QkssaFoyOP4',
        dir: '/media/highlights'
    }
}, ({ id, dir }) => ({
    id,
    image_large: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/" + dir + '/large.webp',
    image_small: "https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/" + dir + '/small.webp',
}))

export function overrides(): (values: DanceEvent[]) => Promise<Record<string, Override>> {
    return async (values: DanceEvent[]) => {
        const out: Record<string, Override> = {}
        for (const event of values) {
            if (event._id && event.band in overridesMap) {
                out[event.band] = { ...overridesMap[event.band] }
            }
        }
        return out
    }
}