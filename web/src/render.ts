import firebase from 'firebase-admin'
import pug from 'pug'
import path from 'path'
import util from 'util'
import fs from 'fs'
import _ from 'lodash'
import sharp from 'sharp'
import glob from 'glob-promise'

const writeFile = util.promisify(fs.writeFile)

firebase.initializeApp()

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

async function render() {
  console.log("Loading versions and images...")
  const [versions, images] = await Promise.all([
    fstore.collection('versions').get(),
    fstore.collection('images').get()
  ])
  console.log(`Found ${_.size(versions)} versions and ${_.size(images)} images`)

  console.log("Rendering pug template...")
  const opts = {
    compileDebug: false,
    pretty: true,
    images: snapshotAsObj(images),
    versions: _.orderBy(snapshotAsObj(versions), versionSort, 'desc')
  }
  const file = path.join(__dirname, '../views/index.pug')
  const html = pug.renderFile(file, opts)

  const outFile = path.join(__dirname, '../public/index.html')

  await writeFile(outFile, html, 'utf8')
  console.log(`File rendered as ${outFile}`)

  const imageFiles = await glob.promise(path.join(__dirname, '../public/img/image?.png'))

  for (const image of imageFiles) {
    console.log(`Resizing ${image}...`)
    await sharp(image)
      .resize(200)
      .toFile(image.replace(/\.png$/, '.thumb.png'))
  }

}

async function run() {
  try {
    await render()
  } catch (error) {
    console.error("An error occured during rendering...")
    console.error(error)
    process.exit(1)
  }
}

run()
