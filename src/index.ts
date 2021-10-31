import {createProxyServer} from "http-proxy"
import {createServer, IncomingMessage, ServerResponse} from "http"
import mongoose from 'mongoose'
import {ProxyServer} from "./service/ProxyServer"
import {config} from "./Config"
import {Log} from "./service/Log"

const log = new Log('index.ts')

log.debug('connecting to db')
mongoose.connect(config.dbUrl, {
	useNewUrlParser: true,
	connectWithNoPrimary: true,
	useUnifiedTopology: true,
	useCreateIndex: true
})
mongoose.connection.on('error', e => {
	log.error('mongodb connection error', e)
})
mongoose.connection.on('connected', () => {
	log.info(`mongodb connected on ${config.dbUrl}`)

	const proxyServer = new class extends ProxyServer {

		idProvider(request: IncomingMessage): string | undefined {
			let header = request.headers[config.idHeader]
			if (header instanceof Array) {
				return ''
			}
			return header
		}

	}(
		createProxyServer({timeout: config.inTimeout, proxyTimeout: config.outTimeout})
	)

	createServer(async (request: IncomingMessage, response: ServerResponse) =>
		await proxyServer.handle(request, response)
	).listen(config.port, () => log.info(`server started on port ${config.port}`))

})
