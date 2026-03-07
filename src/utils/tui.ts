import { inspect, type InspectOptions } from 'node:util'
import { entries, Obj } from './object.ts'
import { stdout } from 'node:process'
import { voidFn } from './helpers.ts'

// Enum exports
export type Ansi = ValueOf<typeof Ansi>
export type Color = Exclude<ValueOf<typeof Color>, AnyFunction>

type Codes =
	| 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 9								//* ST
	| 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37						//? FG
	| 90 | 91 | 92 | 93 | 94 | 95 | 96 | 97						//+ FG
	| 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47						//? BG
	| 100 | 101 | 102 | 103 | 104 | 105 | 106 | 107		//+ BG

type Codes256 =
 | 0  | 1 |  2 |  3 |  4 |  5 |  6 |  7 |  8 |  9 |  10 | 11 | 12 | 13 | 14 | 15
 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31
 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47
 | 48 | 49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59 | 60 | 61 | 62 | 63
 | 64 | 65 | 66 | 67 | 68 | 69 | 70 | 71 | 72 | 73 | 74 | 75 | 76 | 77 | 78 | 79
 | 80 | 81 | 82 | 83 | 84 | 85 | 86 | 87 | 88 | 89 | 90 | 91 | 92 | 93 | 94 | 95
 | 96 | 97 | 98 | 99 | 100 |101 |102 |103 |104 |105 |106 |107 |108 |109 |110 |111
 | 112 |113 |114 |115 |116 |117 |118 |119 |120 |121 |122 |123 |124 |125 |126 |127
 | 128 |129 |130 |131 |132 |133 |134 |135 |136 |137 |138 |139 |140 |141 |142 |143
 | 144 |145 |146 |147 |148 |149 |150 |151 |152 |153 |154 |155 |156 |157 |158 |159
 | 160 |161 |162 |163 |164 |165 |166 |167 |168 |169 |170 |171 |172 |173 |174 |175
 | 176 |177 |178 |179 |180 |181 |182 |183 |184 |185 |186 |187 |188 |189 |190 |191
 | 192 |193 |194 |195 |196 |197 |198 |199 |200 |201 |202 |203 |204 |205 |206 |207
 | 208 |209 |210 |211 |212 |213 |214 |215 |216 |217 |218 |219 |220 |221 |222 |223
 | 224 |225 |226 |227 |228 |229 |230 |231 |232 |233 |234 |235 |236 |237 |238 |239
 | 240 |241 |242 |243 |244 |245 |246 |247 |248 |249 |250 |251 |252 |253 |254 |255

type RCodes256<T extends Codes256 = Codes256> = `38;5;${T}`

type FnJoin = {
	(colors: (Codes | string)): string
	(...colors: (Codes | string)[]): string
}

type Fn256 =
	& SyncFn<[id: Codes256], RCodes256>
	& Record<Codes256, RCodes256>

const color = (id: Color[] | Color | string, str: string = '') =>
	`${Ansi.CSI}${
		typeof id === 'string' ? id : Color.join(id as any)
	}m${str}${Ansi.CSI}0m`

const color256 = (id: Codes256 | string, str?: string) =>
	color(`38;5;${id}`, str)

const linker = (text: string, link: string) =>
	`${Ansi.OSC}8;;${link}${Ansi.BEL}${text}${Ansi.OSC}8;;${Ansi.BEL}`

const ESC = '\x1b'

const Ansi = {
	ESC,
	CSI: `${ESC}[`, /* \x9B */
	OSC: `${ESC}]`, /* \x9D */
	DCS: `${ESC}P`, /* \x90 */
	BEL: '\x07',
	DEL: '\x7f',

	BS: '\b',
	HT: '\t',
	LF: '\n',
	VT: '\v',
	FF: '\f',
	CR: '\r',

} as const

const Color = {

	join: ((...input: AnyArray) => {
		const codes =
			Array.isArray(input[0])
				? input[0]
				: input

		return codes
			// .filter(Boolean)
			.join(';')

	}) as FnJoin,

	256: new Proxy(
		voidFn as unknown as Fn256,
		{
			apply: (_, __, [id]) => `38;5;${id}`,
			get: (_, id: string) => `38;5;${id}`,
		}
	),

	//* Styles
	RESET: 0,
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,

	//? Foreground colors
	BLACK: 30,
	RED: 31,
	GREEN: 32,
	YELLOW: 33,
	BLUE: 34,
	MAGENTA: 35,
	CYAN: 36,
	WHITE: 37,

	//+ Bright foreground colors
	BR_BLACK: 90,
	BR_RED: 91,
	BR_GREEN: 92,
	BR_YELLOW: 93,
	BR_BLUE: 94,
	BR_MAGENTA: 95,
	BR_CYAN: 96,
	BR_WHITE: 97,

	//? Background colors
	BG_BLACK: 40,
	BG_RED: 41,
	BG_GREEN: 42,
	BG_YELLOW: 43,
	BG_BLUE: 44,
	BG_MAGENTA: 45,
	BG_CYAN: 46,
	BG_WHITE: 47,

	//+ Bright background colors
	BG_BR_BLACK: 100,
	BG_BR_RED: 101,
	BG_BR_GREEN: 102,
	BG_BR_YELLOW: 103,
	BG_BR_BLUE: 104,
	BG_BR_MAGENTA: 105,
	BG_BR_CYAN: 106,
	BG_BR_WHITE: 107,
} as const

type EchoLevel = keyof EchoMap
type EchoMap = typeof echoMap
type EchoLvlc = 'cst' | 'vrb'

type EchoTupleType =
	| readonly [id: Color[] | Color, str: string]
	| readonly [id: RCodes256, str: string]

type EchoTuple =
	| EchoTupleType
	| EchoMap[EchoLevel]

type EchoFn = (...args: AnyArray) => void
type EchoFnc = (level: EchoLevel | EchoTuple, ...args: AnyArray) => void
type EchoIsp = {
	(obj: object, opt?: InspectOptions): void
	val: (obj: object, opt?: InspectOptions) => string
}
type EchoErr = {
	(err: Error): void
	(...args: AnyArray): void
}

type WithMap = typeof withMap
type WithProp = keyof WithMap

type WithLine<T> = T & {
	[K in WithProp]: T
}

type Echo =
	& WithLine<EchoFn>
	& { err: WithLine<EchoErr> }
	& { isp: WithLine<EchoIsp> }
	& { [K in EchoLvlc]: WithLine<EchoFnc> }
	& { [K in Exclude<EchoLevel, 'err' | 'isp'>]: WithLine<EchoFn> }

const echoCache = new Obj<string, SyncFn<AnyArray>>()

const echoMap = {
	inf: [Color.BR_BLUE, 'info'],
	err: [Color.BR_RED, 'error'],
	isp: [Color.CYAN, 'inspect'],
	scs: [Color.GREEN, 'success'],
	wrn: [Color.BR_YELLOW, 'warn'],
	unk: [Color.MAGENTA, 'unknown'],
} as const satisfies Record<string, EchoTupleType>

const withMap = {
	ln: Ansi.LF,
	ld: `${Ansi.CSI}K`,
	lr: `${Ansi.CSI}1A${Ansi.CR}`,
} as const satisfies Record<string, string>

//--- Suppresses internal logs ---
const _write = stdout.write.bind(stdout)
const _log = console.log.bind(console)

const ignoreList = [
	'SessionEntry',				//? Baileys session logs
]

stdout.write = (chunk: string | Buffer, encodingOrCallback?: any, callback?: () => void): boolean => {

	const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
	const ignore = ignoreList.some(ignored => str.includes(ignored))

	if (ignore) {
		if (typeof encodingOrCallback === 'function')
			encodingOrCallback()
		else if (callback)
			callback()

		return true
	}

	return _write(chunk, encodingOrCallback, callback)
}

const echoFn = ([id, str]: [Color, string], ...args: AnyArray) =>
	_log(`${withMap.ld}[${color(`1;${id}`, str.toUpperCase())}]`, ...args)

const echoLevel = (p: string): EchoTuple =>
	echoMap[p as EchoLevel] ?? echoMap.unk

const withLine = <T extends SyncFn<AnyArray>>(fn: T) => {

	entries(withMap).forEach(
		([prop, str]) => {
			(fn as any)[prop] = (...args: AnyArray) => fn(...args, str)
		},
	)

	return fn as WithLine<T>
}

const echo = new Proxy(echoFn as Echo,
	{
		apply(_, __, _args) {
			_log(..._args, withMap.ld)
		},

		get(call, prop: string) {
			if (echoCache.has(prop))
				return echoCache.get(prop)

			if (prop in withMap) {
				const fn = (..._args: AnyArray) =>
					_log(..._args, withMap[prop as WithProp] ?? '')

				echoCache.set(prop, fn)
				return fn
			}

			const fn = (..._args: AnyArray) => call(echoLevel(prop), ..._args)

			const fnc = (..._args: AnyArray) => {
				const level = _args.shift()
				return call(
					typeof level === 'string'
						? echoLevel(level)
						: level,
					..._args
				)
			}

			const fne = (..._args: AnyArray) => {
				const err = _args[0]
				if (
					Error.isError(err) && _args.length === 1) {
					return fn(global.args?.verbose ? err : err.message)
				}

				return fn(..._args)
			}

			const fns = (obj: object,
				opt: InspectOptions = {
					depth: null,
					colors: true
				}
			) => (global.args?.verbose ? fn : voidFn)(inspect(obj, opt))

			const fnv = (..._args: AnyArray) => (global.args?.verbose ? fnc : voidFn)(..._args)
			const fni = (..._args: AnyArray) => (global.args?.verbose ? fn : voidFn)(..._args)

			const caller = withLine(
				/* eslint-disable indent */
					prop === 'err' ? fne :
					prop === 'cst' ? fnc :
					prop === 'vrb' ? fnv :
					prop === 'inf' ? fni :
					prop === 'isp' ? fns :
					fn
			) /* eslint-enable indent */

			echoCache.set(prop, caller)
			return caller
		},
	},
)

export {
	color256,
	echoMap,
	linker,
	color,
	Color,
	Ansi,
	echo,
}

export type {
	RCodes256,
	Codes256,
	Codes,
}
