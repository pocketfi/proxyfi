import {ICluster} from "../document/Cluster";
import {IHealth} from "../document/Health";

export interface ClusterStatus {
	cluster: ICluster
	health?: IHealth
	alive: boolean
	userCount: number
}