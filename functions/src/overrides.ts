import { mapValues } from "lodash"
import { SpotifyInfo } from "./metadata_bands"
import { PlacesApiInfo } from "./metadata_places"

const bucket = 'dansguiden-b3a7d.appspot.com'

export const SpotifyInfoOverrides: Record<string, Partial<SpotifyInfo>> = mapValues({
    'Allstars': { dir: 'media/allstars' },
    'Bendix': { dir: 'media/bendix' },
    'C-laget': { dir: 'media/c_laget' },
    'Caspers': { dir: 'media/caspers' },
    'Charlies': { dir: 'media/charlies' },
    'Eklöfs': { dir: 'media/ekl_fs' },
    'Finezze': { dir: 'media/finezze' },
    'Gideons': { id: '', dir: 'media/gideons' },
    'Glads': { dir: 'media/glads' },
    'Hanes Duo': { dir: 'media/hanes_duo' },
    'Hardys': { dir: 'media/hardys' },
    'Herrgårds & Berghorn': { id: '', dir: 'media/herrg_rds___berghorn' },
    'Höilands': { dir: 'media/h_ilands' },
    'Janne Stefans': { dir: 'media/janne_stefans' },
    'Jompaz': { dir: 'media/junix' },
    'Junix': { dir: 'media/junix' },
    'Kenneth & Classe': { dir: 'media/kenneth___classe' },
    'Kjellez': { dir: 'media/kjellez' },
    'Lövgrens': { dir: 'media/l_vgrens' },
    'Ola & Jag': { dir: 'media/ola___jag' },
    'Pär Norlings': { dir: 'media/p_r_norlings' },
    'Remix': { dir: 'media/remix' },
    'Rent Drag': { dir: '/media/rent_drag' },
    'Rixons': { id: '', dir: 'media/rixons' },
    'Streaks': { dir: 'media/streaks' },
    'Strike': { dir: 'media/strike' },
    'Sture Johansson': { dir: 'media/sture_johansson' },
    'Tomas & Co': { dir: 'media/tomas___co' },
    'Tottes': { dir: 'media/tottes' },
    'Trippix': { dir: 'media/trippix' },
    'Trippz': { dir: 'media/trippz' },
    'Wåxbos': { dir: 'media/w_xbos' },
    // With ids
    'Highlights': { id: '2tgdbXtsDz4QkssaFoyOP4', dir: '/media/highlights' }
} as Record<string, { id?: string, dir: string }>, ({ id, dir }) => ({
    id: id ?? '',
    image_large: `https://storage.googleapis.com/${bucket}/${dir}/large.webp`,
    image_small: `https://storage.googleapis.com/${bucket}/${dir}/small.webp`,
}))


export const PlaceApiOverrides: Record<string, Partial<PlacesApiInfo>> = mapValues({
    'Brunnsparken': { dir: 'media/brunnsparken' },
    'Etelhems bygdegård': { dir: 'media/etelhems_bygdeg_rd' },
    'Fyren Norrsundet': { dir: 'media/fyren_norrsundet' },
    'Häreborg': { dir: 'media/h_reborg' },
    'Medborgarhuset Arvidsjaur': { dir: 'media/medborgarhuset_arvidsjaur' },
}, ({ dir }) => ({
    photo_large: `https://storage.googleapis.com/${bucket}/${dir}/large.webp`,
    photo_small: `https://storage.googleapis.com/${bucket}/${dir}/small.webp`,
    photo_attributions: []
}))
