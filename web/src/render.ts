/* eslint-disable no-await-in-loop */
import firebase from 'firebase-admin'
import pug from 'pug'
import path from 'path'
import util from 'util'
import fs from 'fs'
import _ from 'lodash'
import sharp from 'sharp'
import glob from 'glob-promise'

const writeFile = util.promisify(fs.writeFile)

firebase.initializeApp({ projectId: 'dansguiden-b3a7d'})

const fstore = firebase.firestore()

function snapshotAsObj<T>(query: firebase.firestore.QuerySnapshot): T[] {
  const out = [] as T[]
  query.forEach(doc => out.push(doc.data() as T))
  return out
}

export function versionSort(v: { name: string }): string {
  return v.name.split('.', 3)
    .map(s => s.padStart(4, '0'))
    .join('')
}

const files = [
  { name: 'index', data: async () => {
      console.log("Loading versions and images...")
      const versions = await fstore.collection('versions').get()
      console.log(`Found ${_.size(versions)} versions`)
      return {
        versions: _.orderBy(snapshotAsObj(versions), versionSort, 'desc')
      }
    }
  },
  { name: 'privacy', data: async () => ({}) }
]

async function render(): Promise<void> {
  const opts = {
    compileDebug: false,
    pretty: true,
  }

  const imageFiles = await glob.promise(path.join(__dirname, '../public/img/image?.png'))
  const images = imageFiles.map(f => {
    const src = path.join('img', path.basename(f))
    return { src, thumb: src.replace(/\.png$/, ".thumb.png") }
  })

  console.log("Rendering pug template...")
  for (const { name,  data: getdata } of files) {
    const data = await getdata()

    debugger

    const file = path.join(__dirname, `../views/${name}.pug`)
    const html = pug.renderFile(file, { ...opts, ...data, images })
    const outFile = path.join(__dirname, `../public/${name}.html`)

    await writeFile(outFile, html, 'utf8')
    console.log(`File rendered as ${outFile}`)
  }


  for (const image of imageFiles) {
    console.log(`Resizing ${image}...`)
    await sharp(image)
      .resize(200)
      .toFile(image.replace(/\.png$/, '.thumb.png'))
  }

}

async function run(): Promise<void> {
  try {
    await render()
  } catch (error) {
    console.error("An error occured during rendering...")
    console.error(error)
    process.exit(1)
  }
}

run()
