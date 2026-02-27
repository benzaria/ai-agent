import {
	readdir,
	readFile,
	writeFile,
	copyFile,
	unlink,
	rename,
	mkdir,
	stat,
	cp,
	rm,
} from 'node:fs/promises'

import { errors, autoReply, returns, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'
import { spawn } from 'node:child_process'
import { dirname } from 'node:path'

const makeDir = (path: string) => mkdir(dirname(path), { recursive: true })

const run7z = (...args: string[]) => new Promise<{
	stdout: string
	stderr: string
}>((res, rej) => {

	const ps = spawn('7z', args, { stdio: 'pipe' })

	let stdout = ''
	let stderr = ''

	ps.stdout.on('data', d => {
		stdout += d.toString()
	})

	ps.stderr.on('data', d => {
		stderr += d.toString()
	})

	ps.on('close', code => {
		if (code === 0) res({ stdout, stderr })
		else rej(new Error(stderr || `7z exited with ${code}`)
		)
	})

})

const file_system_actions = {

	async exists() {
		const { action, path, keywords = [] } = this
		const lKeywords: string[] = keywords
			.map((key: string) => key.toLowerCase())

		echo.cst([Color.BLUE, action], { path, keywords })

		await readdir(path)
			.then(async files => {
				const result = files.filter(
					file => (
						lKeywords.filter(
							key => file
								.toLowerCase()
								.includes(key),
						)
					).length,
				)

				returns(this, result)
			})
			.catch(err => errors(this, err))
	},

	async make_dir() {
		const { action, path } = this

		echo.cst([Color.BLUE, action], path)

		await mkdir(path, { recursive: true })
			.then(() => autoReply(this, `*[MKDIR]* \`${path}\``))
			.catch(err => errors(this, err))
	},

	async write() {
		const { action, path, content } = this

		echo.cst([Color.GREEN, action], path)
		autoReply(this, content)

		await makeDir(path)
		await writeFile(path, content, 'utf-8')
			.then(() => autoReply(this, `*[WRITE]* \`${path}\``))
			.catch(err => errors(this, err))
	},

	async read() {
		const { action, path } = this

		echo.cst([Color.GREEN, action], path)

		await stat(path)
			.then(async info => {
				let result: string | string[]

				if (info.isDirectory())
					result = (await readdir(path, { withFileTypes: true }))
						.map(file => file.name + (file.isDirectory() ?  '/' : ''))
				else
					result = await readFile(path, 'utf-8')

				returns(this, result)
			})
			.catch(err => errors(this, err))
	},

	async delete() {
		const { action, path } = this

		echo.cst([Color.RED, action], path)

		await stat(path)
			.then(async info => {
				if (info.isDirectory())
					await rm(path, { recursive: true, force: true })
				else
					await unlink(path)

				autoReply(this, `*[DELETE]* \`${path}\``)
			})
			.catch(err => errors(this, err))
	},

	async copy() {
		const { action, from, to } = this

		echo.cst([Color.YELLOW, action], `${from} → ${to}`)

		await makeDir(to)
		await stat(from)
			.then(async info => {
				if (info.isDirectory())
					await cp(from, to, { recursive: true })
				else
					await copyFile(from, to)

				autoReply(this, `*[COPY]* \`${from}\` → \`${to}\``)
			})
			.catch(err => errors(this, err))
	},

	async move() {
		const { action, from, to } = this

		echo.cst([Color.YELLOW, action], `${from} → ${to}`)

		await makeDir(to)
		await rename(from, to)
			.then(() => autoReply(this, `*[MOVE]* \`${from}\` → \`${to}\``))
			.catch(err => errors(this, err))
	},

	async compress() {
		const {
			action,
			path,
			destination,
			archive = 'zip',
		} = this

		try {
			echo.cst([Color.MAGENTA, action], path)

			await makeDir(path)

			// ── .7z ──────────────────
			if (archive === '7z')
				await run7z('a', destination, path)

			// ── .zip ─────────────────
			else if (archive === 'zip')
				await run7z('a', '-tzip', destination, path)

			// ── .tar ─────────────────
			else if (archive === 'tar')
				await run7z('a', '-ttar', destination, path)

			// ── .tar.gz / .tgz ───────
			else if (
				archive === 'tgz' ||
				archive === 'tar.gz'
			) {

				const tarPath =
					destination.replace(
						/\.gz$|\.tgz$/,
						''
					)

				// step 1 → tar
				await run7z('a', '-ttar', tarPath, path)

				// step 2 → gzip
				await run7z('a', '-tgzip', destination, tarPath)

			}

			else {
				throw new Error(
					`Unsupported archive: ${archive}`
				)
			}

			echo.scs.ln(`Archive created → ${destination}`)
			autoReply(this, `*[COMPRESS]* \`${path}\` → \`${destination}\``)

		}
		catch (err: any) {
			errors(this, err)
		}
	},

	async decompress() {
		const { action, path, destination } = this

		try {
			echo.cst([Color.CYAN, action], path)

			await makeDir(destination)
			await run7z('x', path, `-o${destination}`, '-y')

			echo.scs.ln(`Extracted → ${destination}`)
			autoReply(this, `*[DECOMPRESS]* \`${path}\` → \`${destination}\``)

		}
		catch (err: any) {
			errors(this, err)
		}
	},

	async archive_list() {
		const { action, path } = this

		try {
			echo.cst([Color.BLUE, action], path)

			const { stdout } = await run7z('l', path)
			const result = stdout.trim()

			returns(this, result)
		}
		catch (err: any) {
			errors(this, err)
		}
	},

} as const satisfies PActions

export { file_system_actions, makeDir }
