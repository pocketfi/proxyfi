import {createServer, IncomingMessage, ServerResponse} from "http"

const args = process.argv.slice(2)
const port = args[0]
createServer((request: IncomingMessage, response: ServerResponse) => {
		response.write('hello')
		response.end()
	}
).listen(port)
