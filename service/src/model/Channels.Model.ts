import { Schema, model, Document } from "mongoose";
import { apiCrypto } from "../utils/CrytoUtils";

//interface and model will be updated in the future to support payment
export interface IChannel extends Document {
	name: string;
	description: string;
	coverImage: object;
	admins: Array<object>;
	stars: number;
	followers: Array<object>;
	size: number;
	email: string;
	requests: Array<object>;
	category: string;
	locked: string;
	reports: Array<object>;
	publicKey: string;
	privateKey: string;
	secretKey: string;
	activateLock(period: string): Promise<Boolean>;
	deActivateLock(): Promise<Boolean>;
}

const channelSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		coverImage: {
			publicId: String,
			url: String,
		},
		admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
		followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
		requests: [{ type: Schema.Types.ObjectId, ref: "User" }],
		category: {
			type: String,
			default: "tech",
			enum: ["tech", "entertainment", "news", "nature", "politics"],
		},
		stars: Number,
		size: {
			type: Number,
			default: 0,
		},
		email: {
			type: String,
			lowercase: true,
		},
		locked: {
			type: String,
			enum: ["activated", "de-activated"],
			default: "de-activated",
		},
		periodOfDeactivation: {
			type: String,
			enum: ["one-week", "three-weeks", "one-month", "not-set", "none"],
			default: "none",
		},
		reports: {
			type: Array,
		},
		publicKey: String,
		privateKey: String,
		secretKey: String,
	},
	{ _id: true, timestamps: true, toJSON: { virtuals: true } }
);

export const createApiKeys = async function (param: any): Promise<object> {
	const username = param.username;
	const publicKey = await apiCrypto.hashParam(username);
	const userId = param._id;
	const privateKey = await apiCrypto.hashParamJwt(username, userId);
	const secretKey = publicKey.concat(privateKey);
	const data = { publicKey, privateKey, secretKey };
	return data;
};

channelSchema.methods.activateLock = async function (
	period: string
): Promise<Boolean> {
	let success = false;
	this.locked = "activated";
	this.periodOfDeactivation = period;
	const result = await this.save();
	if (result) success = true;
	return success;
};

channelSchema.methods.deActivateLock = async function (): Promise<Boolean> {
	let success = false;
	this.locked = "de-activated";
	this.periodOfDeactivation = "none";
	const result = await this.save();
	if (result) success = true;
	return success;
};

export const channelModel = model<IChannel>("Channel", channelSchema);
