import {Document, model, Schema} from "mongoose"

const userClusterSchema = new Schema({
	userId: {
		type: String,
		required: true,
		unique: true
	},
	url: {
		type: String,
		required: true
	}
})

export interface IUserCluster extends Document {
	userId: string
	url: string
}

export const UserCluster = model<IUserCluster>('userCluster', userClusterSchema)
