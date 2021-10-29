import {JobConfig} from "./Scheduler";
import {ProxyServer} from "./ProxyServer";
import {get} from "http";
import {config} from "../Config";
import {Health} from "../document/Health";

const checkHealth = (proxyServer: ProxyServer) => {
	console.debug(`health check of ${proxyServer.clusterStatuses.length} clusters`)
	proxyServer.clusterStatuses.forEach(clusterStatus => {
		const start = process.hrtime.bigint()
		get(clusterStatus.cluster.url + config.healthPath, {timeout: config.healthTimeout}, response => {
			const responseTime = Math.round(Number(process.hrtime.bigint() - start) / 1000000)
			console.debug(`response from @${clusterStatus.cluster.id} in ${responseTime}`)
			clusterStatus.alive = true
			// @ts-ignore
			clusterStatus.health = {
				clusterId: clusterStatus.cluster.id,
				responseTime: responseTime,
				timestamp: new Date()
			}
			Health.insertMany([clusterStatus.health])
		}).on('error', (e: Error) => {
			console.warn(`no response from @${clusterStatus.cluster.id}, error: "${e.message}"`);
			clusterStatus.alive = false
			// @ts-ignore
			clusterStatus.health = {
				clusterId: clusterStatus.cluster.id,
				responseTime: undefined,
				timestamp: new Date()
			}
			Health.insertMany([clusterStatus.health])
		})
	})
}

const healthReport = (proxyServer: ProxyServer) => {
	console.log('cluster health report')
	console.table(proxyServer.clusterStatuses.map(cs => ({
		id: cs.cluster.id,
		url: cs.cluster.url,
		alive: cs.alive,
		responseTime: cs.health?.responseTime,
		userCount: cs.userCount
	})))
}

const SECOND = 1000
const MINUTE = 60 * SECOND

export const jobConfigs: JobConfig[] = [
	{
		job: checkHealth,
		interval: 12 * SECOND
	},
	{
		job: healthReport,
		interval: 10 * SECOND
	}
]
