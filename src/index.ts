import {createProxyServer} from "http-proxy";
import {createServer, IncomingMessage, ServerResponse} from "http";
import mongoose from 'mongoose'
import {ProxyServer} from "./service/ProxyServer";
import {config} from "./Config";


mongoose.connect(config.dbUrl, {
	useNewUrlParser: true,
	connectWithNoPrimary: true,
	useUnifiedTopology: true
})
	.then(() => console.log(`mongodb connected on ${config.dbUrl}`))
	.catch(err => console.error(err))

const proxyServer = new class extends ProxyServer {

	idProvider(request: IncomingMessage): string | undefined {
		let header = request.headers[config.idHeader];
		if (header instanceof Array) {
			return ''
		}
		return header;
	}

}(
	createProxyServer({timeout: config.inTimeout, proxyTimeout: config.outTimeout})
)

createServer(async (request: IncomingMessage, response: ServerResponse) =>
	await proxyServer.handle(request, response)
).listen(config.port, () => console.log(`server started on port ${config.port}`))
