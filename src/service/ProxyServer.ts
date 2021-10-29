import {UserCluster} from "../document/UserCluster";
import {IncomingMessage, ServerResponse} from "http";
import Server from "http-proxy";
import {ClusterStatus} from "../data/ClusterStatus";
import {Scheduler} from "./Scheduler";
import {jobConfigs} from "./Jobs";
import {Cluster} from "../document/Cluster";

export abstract class ProxyServer {

	proxy: Server;
	cached: Map<string, string> = new Map<string, string>()
	clusterStatuses: ClusterStatus[] = []
	scheduler: Scheduler;

	constructor(proxy: Server) {
		this.proxy = proxy
		this.scheduler = new Scheduler(this, ...jobConfigs)
		setTimeout(() => {
			this.updateClusterStatuses()
			this.watchClusters()
		}, 0)
	}

	async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
		console.debug(request.headers)
		const id = this.idProvider(request)
		if (!id) {
			this.sendError(response, 400, 'no id header provided');
		} else if (id === 'NEW') {
			if (this.clusterStatuses.length === 0) {
				this.sendError(response, 500, 'no clusters available');
				console.warn(`no clusters available for new client @${id}`)
			}
			const mostFreeCluster = this.clusterStatuses
				.reduce((prev: ClusterStatus, curr: ClusterStatus) => prev.userCount < curr.userCount ? prev : curr);
			this.proxyPass(request, response, {target: mostFreeCluster.cluster.url})
		} else {
			const cachedUrl = this.cached.get(id)
			if (cachedUrl === undefined) {
				const userCluster = await UserCluster.findOne({userId: id});
				if (userCluster) {
					this.cached.set(id, userCluster.url)
					console.debug(`proxying request to ${userCluster.url}`)
					this.proxyPass(request, response, {target: userCluster.url})
				} else {
					this.sendError(response, 400, 'provided id header is not exist');
				}
			} else {
				this.proxyPass(request, response, {target: cachedUrl})
			}
		}
	}

	watchClusters() {
		Cluster.watch().on('change', async change => {
			console.debug(`cluster change: ${change}`)
			if (change.operationType === 'insert') {
				console.debug(`new cluster inserted: ${change}`)
				await this.updateClusterStatuses();
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
		console.debug('updated cluster status', this.clusterStatuses.map(cs => cs.cluster.id))
	}

	sendError(response: ServerResponse, code: number, message: string) {
		response.writeHead(code)
		response.write(message)
		response.end()
	};

	proxyPass(request: IncomingMessage, response: ServerResponse, url: Server.ServerOptions) {
		this.proxy.web(request, response, url, e => console.error(e));
	}

	abstract idProvider(request: IncomingMessage): string | undefined

}