import {JobConfig} from "./Scheduler"
import {ProxyServer} from "./ProxyServer"
import {get} from "http"
import {config} from "../Config"
import {Health} from "../document/Health"
import {ClusterStatus} from "../data/ClusterStatus"
import {Log} from "./Log"

const log = new Log('index.ts')

const checkHealth = (proxyServer: ProxyServer) => {
	const handle = (clusterStatus: ClusterStatus, responseTime?: number, statusCode?: number) => {
		clusterStatus.alive = !!responseTime && statusCode === 200
		// @ts-ignore
		clusterStatus.health = {
			clusterId: clusterStatus.cluster.id,
			responseTime: responseTime,
			timestamp: new Date()
		}
		Health.insertMany([clusterStatus.health])
	}

	log.debug(`health check of ${proxyServer.clusterStatuses.length} clusters`)
	proxyServer.clusterStatuses.forEach(clusterStatus => {
		const start = process.hrtime.bigint()
		get(clusterStatus.cluster.url + config.healthPath, {timeout: config.healthTimeout}, response => {
			const responseTime = Math.round(Number(process.hrtime.bigint() - start) / 1000000)
			log.debug(`response from @${clusterStatus.cluster.id} in ${responseTime}`)
			handle(clusterStatus, responseTime, response.statusCode)
		}).on('error', (e: Error) => {
			log.warn(`no response from @${clusterStatus.cluster.id}, error: "${e.message}"`)
			handle(clusterStatus)
		})
	})
}

const healthReport = (proxyServer: ProxyServer) => {
	log.info('cluster health report')
	console.table(proxyServer.clusterStatuses.map(cs => ({
		id: cs.cluster.id,
		url: cs.cluster.url,
		alive: cs.alive,
		responseTime: cs.health?.responseTime,
		userCount: cs.userCount
	})))
}

const SECOND = 1000

export const jobConfigs: JobConfig[] = [
	{
		job: checkHealth,
		interval: 60 * SECOND
	},
	{
		job: healthReport,
		interval: 60 * SECOND
	}
]
