import {ProxyServer} from "./ProxyServer"

export interface JobConfig {
	job: (proxyServer: ProxyServer) => void
	interval: number
}

export class Scheduler {

	constructor(proxyServer: ProxyServer, ...jobsConfig: JobConfig[]) {
		jobsConfig.forEach(({job, interval}) =>
			setInterval(() => job(proxyServer), interval))
	}

}