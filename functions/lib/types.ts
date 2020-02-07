
export type Artist = {
  id: string;
  name: string;
  genres: string[];
  images: ArtistImage[];
}

export type ArtistImage = {
  height?: number;
  width?: number;
  url: string;
}

export type Counter = {
  _id: string;
  count: number;
}

export type DanceEvent = {
  _id?: string;
  band: string;
  city: string;
  county: string;
  date: string;
  place: string;
  region: string;
  spotify_id?: string;
  spotify_image?: string;
  time: string;
  updated_at?: number;
  weekday: string;
  extra: string;
}
