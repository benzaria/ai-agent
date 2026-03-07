import { autoReply, returns, errors, mapKey, type PActions } from './consts.ts'
import { runAction, supportError } from '../interaction.ts'
import { hotImport, queue, repeat, until } from '../../utils/helpers.ts'
import { Color, echo } from '../../utils/tui.ts'
import { Obj } from '../../utils/object.ts'
import { env } from '../../utils/config.ts'
import { writeFile } from 'fs/promises'
import { CronJob } from 'cron'
import { join } from 'path'

const command_actions = {

	async execute() {
		const { action, command } = this

		echo.cst.ln([Color.GREEN, action], command)

		await new AsyncFunction(command)()
			.then(result => returns(this, result))
			.catch(err => errors(this, err))
	},

	auth_user() {
		const { action } = this
		supportError(this, action)
	},

	/* ---------------- JOB METHODS ---------------- */

	async 'job.run'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		// job.timer?.stop()
		job.lastRun = Date.now()
		jobs.set(id, job)
		saveJobs()

		await runJob(this, job)
	},

	async 'job.has'() {
		const { action, id = '', keywords } = this
		echo.cst.ln([Color.CYAN, action], { id, keywords })

		let job: Job | Jobs | undefined

		job = jobs.get(id)
		if (job)
			return await returns(this, { [id]: mapJob(job) })

		const lKeywords = mapKey(keywords)

		job = jobs
			.filter(
				(job, _id) => (
					_id.includes(id) ||
					lKeywords.some(
						key => (
							job.description
								.toLowerCase()
								.includes(key)
						)
					)
				)
			)._map(mapJob)

		await returns(this, job)
	},

	async 'job.get'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		await returns(this, { [id]: mapJob(job) })
	},

	'job.set'() {
		const { action, description = '', command, cron, keywords } = this
		let { id } = this
		echo.cst.ln([Color.CYAN, action], { id, command, cron })

		if (!command)
			return errors(this, { msg: 'Missing command' })

		if (jobs.has(id ??= genJobId(mapKey(keywords))))
			return errors(this, { msg: 'Job already exists' })

		const job: Job = { id, description, command, cron }

		jobs.set(id, cronJob(this, job))
		saveJobs()

		// returns(this, { id, request: 'none' })
		autoReply(this, `*[WRITE]* job: \`${id}\``)
	},

	'job.del'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		job.timer?.stop()
		jobs.delete(id)
		saveJobs()

		autoReply(this, `*[DELETE]* job: \`${id}\``)
	},

} as const satisfies PActions

export { command_actions }

type Job = {
	id: string
	cron?: string
	command: string
	description: string
} & {
	lastRun?: number
	/** @runtime */
	timer?: CronJob
}

type Jobs = Record<string, Job>

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as {
	new (...args: string[]): AsyncFn<any[], any>
	(...args: string[]): AsyncFn<any[], any>
	readonly prototype: AsyncFn<any[], any>
}

const mapJob = ({ timer, ...job }: Job) => job

const genJobId = ([type]: string[]) =>
	`${
		type ? type + '-' : ''
	}${
		Date.now().toString(36)
	}-${
		Math.random().toString(36).slice(2, 8)
	}`

function cronJob({ jid }: { jid: string }, job: Job) {
	if (job.cron) {
		echo.cst([Color.CYAN, 'job.cron'], job)

		job.timer =  CronJob.from({
			start: true,
			cronTime: job.cron,
			onTick: function () {
				runAction({
					action: 'job.run',
					jid, uid: jid,
					id: job.id,
				} as any)
			}
		})
	}

	return job
}

async function runJob(_this: { jid: string }, job: Job) {

	await new AsyncFunction(job.command)()
		.then(res => returns(_this as any, res))
		.catch(err => errors(_this as any, err))
}

const jobsPath = join(__agentdir, 'jobs.json')

async function loadJobs(force: boolean = false) {
	if (global.jobs && !force) return global.jobs
	let jobs: Jobs

	try {
		jobs = await hotImport(jobsPath)
	}
	catch (err) {
		echo.err(err)
		jobs = {}
	}

	echo.vrb([Color[256][33], 'jobs'], jobs)
	global.jobs = new Obj(jobs)

	until(() => global.isReady, undefined, '1'.s)
		.then(function () {
			global.jobs.forEach(
				job => cronJob({ jid: env.owner_lid }, job)
			)
		})
		.catch(echo.err)

	return global.jobs
}

const saveJobs = queue(
	async function (job?: Job) {
		if (job) jobs.set(job.id, job)

		await writeFile(
			jobsPath,
			jobs.json(
				(key, job) => {
					if (key === 'timer')
						return undefined

					return job
				}, 2
			)
		).catch(echo.err)

		return jobs
	}
)

await loadJobs(global.isReloading)

export {
	loadJobs,
	saveJobs,
}

export type {
	Jobs,
	Job,
}
