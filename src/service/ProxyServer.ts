import {UserCluster} from "../document/UserCluster"
import {IncomingMessage, ServerResponse} from "http"
import Server from "http-proxy"
import {ClusterStatus} from "../data/ClusterStatus"
import {Scheduler} from "./Scheduler"
import {jobConfigs} from "./Jobs"
import {Cluster} from "../document/Cluster"
import {Log} from "./Log"

export abstract class ProxyServer {

	proxy: Server
	cached: Map<string, string> = new Map<string, string>()
	clusterStatuses: ClusterStatus[] = []
	scheduler: Scheduler
	log: Log = new Log(ProxyServer.name)

	constructor(proxy: Server) {
		this.proxy = proxy
		this.scheduler = new Scheduler(this, ...jobConfigs)
		setTimeout(() => {
			this.updateClusterStatuses()
			this.watchClusters()
		}, 0)
	}

	async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
		this.log.debug(`${request.method} ${request.url}`)
		if (request.url === '/health') {
			await this.handleHealthReport(request, response)
		} else {
			await this.handleProxy(request, response)
		}
	}

	async handleHealthReport(request: IncomingMessage, response: ServerResponse): Promise<void> {
		response.setHeader('Content-Type', 'application/json')
		response.writeHead(200)
		response.write(JSON.stringify(this.clusterStatuses))
		response.end()
	}

	async handleProxy(request: IncomingMessage, response: ServerResponse): Promise<void> {
		const id = this.idProvider(request)
		if (!id) {
			this.sendError(response, 400, 'no id header provided')
		} else if (id === 'NEW') {
			if (this.clusterStatuses.length === 0) {
				this.sendError(response, 500, 'no clusters available')
				this.log.warn(`no clusters available for new client @${id}`)
			}
			const mostFreeCluster = this.clusterStatuses
				.reduce((prev: ClusterStatus, curr: ClusterStatus) => prev.userCount < curr.userCount ? prev : curr)
			this.proxyPass(request, response, {target: mostFreeCluster.cluster.url})
		} else {
			const cachedUrl = this.cached.get(id)
			if (cachedUrl === undefined) {
				const userCluster = await UserCluster.findOne({userId: id})
				if (userCluster) {
					this.cached.set(id, userCluster.url)
					this.log.debug(`proxying request to ${userCluster.url}`)
					this.proxyPass(request, response, {target: userCluster.url})
				} else {
					this.sendError(response, 400, 'provided id header is not exist')
				}
			} else {
				this.proxyPass(request, response, {target: cachedUrl})
			}
		}
	}

	watchClusters(): void {
		Cluster.watch().on('change', async change => {
			this.log.debug(`cluster change: ${change}`)
			if (change.operationType === 'insert') {
				this.log.debug(`new cluster inserted: ${change}`)
				await this.updateClusterStatuses()
				console.debug(this.clusterStatuses)
			}
		})
	}

	async updateClusterStatuses(): Promise<void> {
		this.clusterStatuses = await Cluster.aggregate([
			{
				$lookup: {
					from: 'userclusters',
					localField: 'id',
					foreignField: 'clusterId',
					as: 'users'
				}
			},
			{
				$lookup: {
					from: 'health',
					localField: 'id',
					foreignField: 'clusterId',
					as: 'health'
				}
			},
			{
				$project: {
					cluster: {id: '$id', url: '$url'},
					userCount: {$size: '$users'},
					health: [
						{$last: '$health'}
					]
				}
			}
		])
		this.log.debug('updated cluster status')
		console.debug(this.clusterStatuses.map(cs => cs.cluster.id))
	}

	sendError(response: ServerResponse, code: number, message: string): void {
		response.writeHead(code)
		response.write(message)
		response.end()
	}

	proxyPass(request: IncomingMessage, response: ServerResponse, url: Server.ServerOptions): void {
		this.proxy.web(request, response, url, (e: Error) => this.log.error('error proxying request', e))
	}

	abstract idProvider(request: IncomingMessage): string | undefined

}