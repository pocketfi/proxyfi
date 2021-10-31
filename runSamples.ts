import {exec} from "child_process"

for (let i = 0 i < 10
i++
)
{
	const command = `ts-node sample.ts ${8000 + i} &`
	console.log(command)
	exec(command)
}