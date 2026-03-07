import { parseArgs, type ParseArgsOptionsConfig } from 'node:util'
import { Color, echo } from '../utils/tui.ts'
import { env } from '../utils/config.ts'

declare global {
	var args: Prettify<
    Omit<
      Required<typeof values>,
      'headed' | 'persona' | 'model' | 'port'
    > & {
      headless: boolean | 'new'
			persona: Personas
      model: Models
			port: number
    }
  >

  var __args: string[]
}

const options = {

	headed: {
		short: 'h',
		type: 'boolean',
		default: false,
	},

	'new-conv': {
		//  short: 'nc',
		type: 'boolean',
		default: false,
	},

	'best-conv': {
		//  short: 'bc',
		type: 'boolean',
		default: false,
	},

	verbose: {
		short: 'v',
		type: 'boolean',
		default: false,
	},

	port: {
		short: 'P',
		type: 'string',
		default: ''+env.port,
	},

	model: {
		short: 'm',
		type: 'string',
		default: env.model,
	},

	persona: {
		short: 'p',
		type: 'string',
		default: env.persona,
	}

} as const satisfies ParseArgsOptionsConfig

const argsMap = {
	'-nc': '--new-conv',
	'-bc': '--best-conv',
	'--headless': '',
} as const satisfies Record<`-${string}`, `--${string}` | ''>

const preParseArgv = (argv: string[]) => argv.map(
	arg => (argsMap as any)[arg] ?? arg
)

const { values, positionals } = parseArgs({
	args: preParseArgv(process.argv.slice(2)),
	allowPositionals: true,
	options,
})

const _args: typeof args = { ...values as any }
delete (_args as any)['headed']
_args.headless = values.headed === true ? false : 'new'

global.args = _args
global.__args = positionals

if (args.verbose) {
	echo.vrb([Color.BR_BLUE, 'args'], { ..._args, headless: !values.headed })
	echo.vrb([Color.BR_BLUE, 'env'], env)
}
