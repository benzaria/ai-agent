import { hotImport, lazy } from '../src/utils/helpers.ts'
import { echo } from '../src/utils/tui.ts'
import { writeFileSync } from 'node:fs'

hotImport.bind({ root: import.meta.dirname })

writeFileSync('./test/data.json', '{ "name": "name" }')

const fn = lazy(() => hotImport('data.json'))

const data = await fn()

echo(data)

writeFileSync('./test/data.json', '{ "name": "name", "first": "first" }')

echo(await fn())

fn.clear()
echo(await fn())

writeFileSync('./test/data.json', '{ "name": "name", "last": "last" }')

echo(await fn.reload())
