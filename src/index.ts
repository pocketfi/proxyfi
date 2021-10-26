import Server, {createProxyServer} from "http-proxy";
import {createServer, IncomingMessage, ServerResponse} from "http";
import {ClusterStats} from "./model/ClusterStats";
import {UserCluster} from "./model/UserCluster";
import mongoose from 'mongoose'
import * as dotenv from 'dotenv';

const fetchClusterStats = async (): Promise<ClusterStats[]> => {
	return await UserCluster
		.aggregate([
			{$group: {_id: "$url", userCount: {$sum: 1}}},
		])
		.project({
			_id: 0,
			url: '$_id',
			userCount: 1
		})
		.exec();
}

const idProvider: (request: IncomingMessage) => string | undefined = request => {
	let header = request.headers[config.idHeader];
	if (header instanceof Array) {
		return ''
	}
	return header;
}

const sendError = (response: ServerResponse, code: number, message: string) => {
	response.writeHead(code)
	response.write(message)
	response.end()
};

const proxyPass = (proxy: Server, request: IncomingMessage, response: ServerResponse, url: Server.ServerOptions) => {
	proxy.web(request, response, url, e => console.error(e));
}

dotenv.config()
const config = {
	port: process.env.PORT!,
	idHeader: process.env.ID_HEADER!,
	dbUrl: process.env.DB_URL!,
	inTimeout: parseInt(process.env.IN_TIMEOUT!) || 1000,
	outTimeout: parseInt(process.env.OUT_TIMEOUT!) || 1000
}

mongoose.connect(config.dbUrl)
	.then(() => console.log(`mongodb connected on ${config.dbUrl}`))
	.catch(err => console.log(err))

const cached: Map<string, string> = new Map<string, string>()
const proxy = createProxyServer({timeout: config.inTimeout, proxyTimeout: config.outTimeout});

(async () => {
	const clusterStats = await fetchClusterStats();
	if (clusterStats.length === 0) {
		console.error('no clusters available')
	} else {
		console.log(clusterStats)
	}
})()

createServer(async (request: IncomingMessage, response: ServerResponse) => {
	console.log(request.headers)
	const id = idProvider(request)

	if (!id) {
		sendError(response, 400, 'no id header provided');
	} else if (id === 'NEW') {
		const stats = await fetchClusterStats();
		if (stats.length === 0) {
			sendError(response, 500, 'no clusters available');
		}
		console.log(stats)
		const mostFreeCluster = stats
			.reduce((prev, curr) => prev.userCount < curr.userCount ? prev : curr);
		mostFreeCluster.userCount += 1
		proxyPass(proxy, request, response, {target: mostFreeCluster.url})
	} else {
		const cachedUrl = cached.get(id)
		if (cachedUrl === undefined) {
			const userCluster = await UserCluster.findOne({userId: id});
			if (userCluster) {
				cached.set(id, userCluster.url)
				console.log(`proxying request to ${userCluster.url}`)
				proxyPass(proxy, request, response, {target: userCluster.url})
			} else {
				sendError(response, 400, 'provided id header is not exist');
			}
		} else {
			proxyPass(proxy, request, response, {target: cachedUrl})
		}
	}
})
	.listen(config.port, () => console.log(`server started on port ${config.port}`))