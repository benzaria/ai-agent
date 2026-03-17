import { autoReply, returns, errors, mapKey, type PActions, type ActionsType } from './consts.ts'
import { hotImport, queue } from '../../utils/helpers.ts'
import { parser, runAction } from '../interaction.ts'
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
			.then(res => returns(this, res))
			.catch(err => errors(this, err))
	},

	auth_user() {
		const { action, user } = this
		echo.cst.ln([Color.GREEN, action], user)

		// supportError(this, action)

		secrets.set('auth_users', [
			...secrets.get('auth_users') ?? [],
			user
		])
		// saveSecrets()

		autoReply(this, `*[AUTH]* user: \`${user}\``)
	},

	/* ---------------- JOB METHODS ---------------- */

	'job.start'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		jobs.set(id, cronJob(this, job))
		autoReply(this, `*[START]* job: \`${id}\``)
	},

	'job.stop'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		job.timer?.stop()
		autoReply(this, `*[STOP]* job: \`${id}\``)
	},

	async 'job.runing'() {
		const { action, id = '', keywords } = this
		echo.cst.ln([Color.CYAN, action], { id })

		let job: Job | Jobs | undefined

		job = jobs.get(id)
		if (job && job.timer)
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
				) && job.timer
			)._map(mapJob)

		await returns(this, job)
	},

	async 'job.run'() {
		const { action, id = '' } = this
		echo.cst.ln([Color.CYAN, action], { id })

		const job = jobs.get(id)
		if (!job)
			return errors(this, { msg: 'Job not found' })

		job.lastRun = Date.now()
		jobs.set(id, job)

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
		let { action, id, keywords } = this
		let job: Job | undefined

		if (id && jobs.has(id))
			job = jobs.get(id)

		let { actions, description = '', cron } = { ...job, ...this }
		id ??= genJobId(mapKey(keywords))

		echo.cst.ln([Color.CYAN, action], { id, actions, cron })

		if (!actions)
			return errors(this, { msg: 'Missing actions' })

		job = { id, description, actions, cron }

		jobs.set(id, job)

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

		autoReply(this, `*[DELETE]* job: \`${id}\``)
	},

} as const satisfies PActions

export { command_actions }

type Job = {
	id: string
	cron?: string
	actions: ActionsType[]
	description: string
} & {
	lastRun?: number
	/** @runtime cron */
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

function cronJob({ jid, uid = jid }: { jid: string, uid?: string }, job: Job) {
	if (job.cron) {
		echo.cst([Color.CYAN, 'job.cron'], job)

		job.timer =  CronJob.from({
			start: true,
			cronTime: job.cron,
			onTick: function () {
				runAction({
					action: 'job.run',
					id: job.id,
					jid, uid,
				} as any)
			}
		})
	}

	return job
}

async function runJob(_this: { jid: string, uid?: string }, job: Job) {
	if (job.actions)
		await parser({
			..._this as any,
			response: job.actions
		})
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
	global.jobs = new Obj(jobs, 'Jobs')

	if (!global.isReady)
		event.once('Agent-ready',
			function () {
				global.isReady = true
				global.jobs.forEach(
					job => cronJob({ jid: env.owner_lid }, job)
				)
			}
		)

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

event.on('Jobs-set', saveJobs)
event.on('Jobs-map', saveJobs)
event.on('Jobs-delete', saveJobs)
event.on('Jobs-filter', saveJobs)

await loadJobs(global.isReloading)

export {
	loadJobs,
	saveJobs,
}

export type {
	Jobs,
	Job,
}
