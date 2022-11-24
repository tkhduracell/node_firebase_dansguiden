import { TableFn } from "../lib/database"
import { snapshotAsArray } from "../lib/utils"

type Image = {
  src: string;
  text: string;
}

export class Images {
  static async fetch(table: TableFn): Promise<Image[]> {
    const images = await table('images').get()
    return snapshotAsArray<Image>(images)
  }
}
