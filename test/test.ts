/*
// eslint-disable-next-line no-console
const log = console.log

type Stringifiable =
  | null
  | number
  | string
  | boolean
  | undefined

function echo(strings: TemplateStringsArray, ...args: Stringifiable[]) {

	log({ strings, args })

	log(
		strings
			.flatMap(
				(str, idx) => [str, args[idx]]
			).join('')
	)

}

echo `test1`

echo `test${'2'}`
 */
