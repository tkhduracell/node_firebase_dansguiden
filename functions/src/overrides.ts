import { mapValues } from "lodash"
import { SpotifyInfo } from "./metadata_bands"

// Generic typ that makes a specific value of a key marked optional...
type Optional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[K] }

export type Override = Optional<Pick<Required<SpotifyInfo>, 'image_large' | 'image_small' | 'id'>, 'id'>

export const artistsOverrides: Record<string, Override> = mapValues({
    'Allstars': { dir: 'media/allstars' },
    'C-laget': { dir: 'media/c_laget' },
    'Caspers': { dir: 'media/caspers' },
    'Charlies': { dir: 'media/charlies' },
    'Eklöfs': { dir: 'media/ekl_fs' },
    'Glads': { dir: 'media/glads' },
    'Hanes Duo': { dir: 'media/hanes_duo' },
    'Hardys': { dir: 'media/hardys' },
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
    image_large: `https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/${dir}/large.webp`,
    image_small: `https://storage.googleapis.com/dansguiden-b3a7d.appspot.com/${dir}/small.webp`,
}))