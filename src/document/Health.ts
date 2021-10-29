import {Document, model, Schema} from "mongoose"

const schema = new Schema({
	clusterId: {
		type: Schema.Types.String,
		required: true
	},
	responseTime: {
		type: Schema.Types.Number
	},
	timestamp: {
		type: Schema.Types.Date,
		required: true
	}
})

export interface IHealth extends Document {
	clusterId: string
	responseTime?: number
	timestamp: Date
}

export const Health = model<IHealth>('health', schema)
