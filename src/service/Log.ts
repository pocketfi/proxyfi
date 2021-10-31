import chalk from "chalk"

export enum LogLevel {
	TRACE = 0,
	DEBUG = 1,
	INFO = 2,
	WARN = 3,
	ERROR = 4
}

export const logLevelDisplayMap = new Map<number, string>([
	[LogLevel.TRACE, chalk.blue(LogLevel[LogLevel.TRACE])],
	[LogLevel.DEBUG, chalk.cyan(LogLevel[LogLevel.DEBUG])],
	[LogLevel.INFO, chalk.green(LogLevel[LogLevel.INFO])],
	[LogLevel.WARN, chalk.yellow(LogLevel[LogLevel.WARN])],
	[LogLevel.ERROR, chalk.red(LogLevel[LogLevel.ERROR])],
])

export class Log {

	clazz: any

	constructor(clazz: any) {
		this.clazz = clazz
	}

	trace(msg: string) {
		console.log(this.format(msg, LogLevel.TRACE))
	}

	debug(msg: string) {
		console.log(this.format(msg, LogLevel.DEBUG))
	}

	info(msg: string) {
		console.log(this.format(msg, LogLevel.INFO))
	}

	warn(msg: string) {
		console.log(this.format(msg, LogLevel.WARN))
	}

	error(msg?: string, e?: Error) {
		console.error(msg ? this.format(msg, LogLevel.ERROR) : undefined, e)
	}

	format(msg: string, level: LogLevel): string {
		const levelStr = logLevelDisplayMap.get(level)
		return new Date().toISOString().padEnd(26) +
			(levelStr || '').padEnd(18) +
			((this.clazz ? this.clazz.toString() : '').padEnd(20) + ' :  ') +
			msg
	}

}