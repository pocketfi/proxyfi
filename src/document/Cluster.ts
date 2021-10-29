import {Document, model, Schema} from "mongoose"

const schema = new Schema({
	id: {
		type: Schema.Types.String,
		required: true,
		unique: true
	},
	url: {
		type: Schema.Types.String,
		required: true,
	},
})

export interface ICluster extends Document {
	id: string
	url: string
}

export const Cluster = model<ICluster>('cluster', schema)
