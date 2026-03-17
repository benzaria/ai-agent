import { code, number, string, stringArr, type InstructionsType } from './consts.ts'

const agent_actions = [
	{
		name: 'talk',
		description: 'Conversational or contextual response',
		structure: {
			action: 'talk',
			text: string
		},
		rules: [
			'Use for replies, confirmations, or generated conversational output',
			'Text must be plain',
			'No markdown formatting',
			'No extra fields allowed',
			'When listing elements make each one in a line, prefix with `-`'
		]
	},
	{
		name: 'messenger',
		description: 'Send a platform message',
		structure: {
			action: 'messenger',
			platform: code,
			to: string,
			message: string,
			'file?': string,
			'mimetype?': string,
		},
		platform_codes: [
			'whatsapp',
			'telegram'
		],
		rules: [
			'Default platform: whatsapp',
			'Infer recipient from {from} when replying',
			'Use {mentions[]} to resolve targets when applicable',
			'To mention recipients in messages use this format `@123456789`',
			'Generate message text if user intent implies sending but text missing',
			'Do not fabricate unknown recipients',
			'Message can have platform specific formatting',
			'When listing elements make each one in a line, prefix with `-`',
			'Use {file} to refer a file path to send, {minetype} to refer the sent file type'
		]
	},
	{
		name: 'contact',
		description: 'search saved contacts',
		returns_result: true,
		structure: {
			action: 'contact.{has|get|set|del}',
			'name?': string,
			'number?': number,
			'keywords?': stringArr
		},
		rules: [
			'Keywords are ideas of what the name could be made of for {has}',
			'Use {has} to list contacts with NO keywords',
			'Don\'t invoke {get} with empty an name',
			'Invoke {set} with only ONE keyword'
		]
	},
	{
		name: 'sys',
		description: 'control host system',
		structure: {
			action: 'sys.{shutdown|restart|reload}',
			reason: string,
		},
		rules: [
			'Only use when an auth user has requested it',
			'Only use when a normal user hase provided confirmation (admin_key)',
			'Always check auth users list before judging',
			'Do NOT shutdown system for no other reason',
			'Reload meth must be used after every modification on actions'
		]
	},
	{
		name: 'status',
		description: 'Report agent/system status',
		structure: {
			action: 'status',
			state: code,
			details: string
		},
		state_codes: [
			'OK',
			'BAD'
		],
		rules: [
			'Use when health or readiness is queried',
			'Include NON-SENSITIVE environment details in a list'
		]
	},
	{
		name: 'error',
		description: 'Report execution or intent errors',
		structure: {
			action: 'error',
			error: code,
			details: string,
			'suggested_fix?': string,
			'missing_fields?': stringArr,
		},
		error_codes: [
			'MISSING_INFORMATION',
			'INVALID_STRUCTURE',
			'UNSUPPORTED_ACTION',
			'UNAUTHORIZED_USER',
			'AMBIGUOUS_INTENT',
			'EXECUTION_FAILED',
			'PARSER_RISK'
		],
		rules: [
			'Use only when reasoning cannot safely recover missing data'
		]
	},
	{
		name: 'auth_user',
		description: 'authonticate new users',
		structure: {
			action: 'auth_user',
			user: string,
		},
		rules: []
	},
	{
		name: 'execute',
		description: 'Execute NodeJS code',
		returns_result: true,
		structure: {
			action: 'execute',
			command: string
		},
		rules: [
			'You must ALWAYS return a value; the output of the function is the result.',
			'You must ALWAYS start command string with `return` keyword',
			'Do NOT use top-level "import", "require", or any module syntax. Only dynamic "await import(...)" is allowed.',
			'The command is executed using "Function()", so only include executable JS expressions or function bodies.',
			'Supports async/await syntax; you can mark the function as "async" if needed.',
			'Do NOT use variable declarations (const, let, var) at top-level if they prevent returning a value.',
			'Do NOT use console.log() or other output; all results must be returned using `return` keyword.',
			'Refuse destructive operations (like deleting files) unless explicit confirmation is given.',
			'Do NOT include multiple statements separated by commas; ensure each expression produces a returnable value.',
			'Do NOT use browser only globals, you"re running on NodeJS'
		]
	},
	{
		name: 'job',
		description: 'Execute and cron jobs',
		returns_result: true,
		structure: {
			action: 'job.{has|get|set|del|run|start|stop|runing}',
			'id?': string,
			'description?': string,
			// 'command?': string,
			'actions?': 'action[]' as unknown as any[],
			'cron?': string,
			'keywords?': stringArr
		},
		rules: [
			'Keywords are ideas of what the description could be made of for {has}',
			'Use {has} to list contacts with NO keywords',
			'Don\'t invoke {get} with an empty id',
			'Invoke {set} with only ONE keyword',
			'Use {start}, {stop} and {runing} to control and list scheduled jobs',
			'{actions} Must follow the same rules and structures of current defined actions',
		]
	},
	{
		name: 'fs',
		description: 'control file system',
		returns_result: true,
		structure: {
			action: 'fs.{read|write|delete|copy|move|exists|list|mkdir}',
			path: string,
			'content?': string,
			'destination?': string,
			'keywords?': stringArr,
		},
		rules: [
			'Fallback path: {agent_dir}',
			'Infer path when possible contextually obvious',
			'Generate filenames if missing and prefix with {copy: "cp_", move: "mv_", write: "wr_", mkdir: "md_"}',
			'Keywords are ideas of what the file name could be made of for {exists}',
			'Don\'t read files that are NOT UTF-8 safe, like images, pdfs, binaries...'
		]
	},
	{
		name: 'archive',
		description: 'Control archive files',
		structure: {
			action: 'archive.{compress|decompress|list}',
			path: string,
			destination: string,
			archive: code,
		},
		archive_codes: [
			'7z',
			'zip',
			'tar',
			'gz',
			'tar.gz',
			'tgz',
		],
		rules: [
			'Fallback path: {agent_dir}',
			'Infer path when possible contextually obvious',
			'Generate filename if missing and prefix with {compressed: "cx_": , decompressed: "dx_"}',
			'{destination} Must include the full path of the archive',
			'{archive} Must only specify the archive type, NOT the name'
		]
	},
	{
		name: 'calculate',
		description: 'Math computation',
		returns_result: true,
		structure: {
			action: 'calculate',
			expression: string
		},
		rules: [
			'The result of the expression is the output.',
			'You must NEVER start command string with `return` keyword',
			'Do NOT use variable declarations like const, let, or var; they will break the evaluation.',
			'You may normalize expressions before execution.',
			'Expressions can include NodeJS libraries.',
			'Expressions are executed using Function(`return (${expression})`), so only include expressions that produce a value.',
			'Avoid using commas to separate multiple statements; use single expressions instead.'
		]
	},
	{
		name: 'download',
		description: 'Download file',
		structure: {
			action: 'download',
			url: string,
			destination: string
		},
		rules: [
			'Fallback path: {agent_dir}',
			'Infer path when possible contextually obvious',
			'Generate filename if missing and prefix with "dn_"',
		]
	},
	{
		name: 'search',
		description: 'Web search',
		structure: {
			action: 'search',
			result: string
		},
		rules: [
			'You do the search and return the result'
		]
	},
	{
		name: 'fetch',
		description: 'HTTP request',
		structure: {
			action: 'fetch',
			method: code,
			url: string,
			headers: string,
			body: string
		},
		method_codes: [
			'GET',
			'POST',
			'PUT',
			'DELETE'
		],
		rules: [
			'Default method: GET'
		]
	}
] as const satisfies InstructionsType['actions']

export { agent_actions }
