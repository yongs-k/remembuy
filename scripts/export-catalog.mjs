import { writeFile } from 'node:fs/promises'
import { LOCATIONS, CATEGORIES } from '../src/data/locations.ts'

const spaces = LOCATIONS.map((location) => ({
  id: location.id,
  name: location.name,
  groups: CATEGORIES.filter((category) => category.locationId === location.id).map((category) => ({
    id: category.id,
    name: category.name,
    slots: category.masterItems.map((item) => ({ id: item.id, name: item.name })),
  })),
}))

await writeFile(
  new URL('../server/game/catalog.seed.json', import.meta.url),
  JSON.stringify({ spaces }, null, 2) + '\n'
)
console.log(
  `spaces=${spaces.length} groups=${spaces.reduce((n, s) => n + s.groups.length, 0)} slots=${spaces.reduce(
    (n, s) => n + s.groups.reduce((m, g) => m + g.slots.length, 0),
    0
  )}`
)
