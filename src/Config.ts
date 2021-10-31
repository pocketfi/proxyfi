import * as dotenv from "dotenv"
import {Log} from "./service/Log";

export interface Config {
	port: string
	idHeader: string
	dbUrl: string
	inTimeout: number
	outTimeout: number
	healthTimeout: number
	healthPath: string
}

dotenv.config()

export const config: Config = {
	port: process.env.PORT!,
	idHeader: process.env.ID_HEADER!,
	dbUrl: process.env.DB_URL!,
	inTimeout: parseInt(process.env.IN_TIMEOUT!) || 1000,
	outTimeout: parseInt(process.env.OUT_TIMEOUT!) || 1000,
	healthTimeout: parseInt(process.env.HEALTH_TIMEOUT!) || 1000,
	healthPath: '/health'
};

(() => {
	const log = new Log('Config.ts')
	log.info('config initialized')
	console.log(config)
})()