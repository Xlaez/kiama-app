import { Schema, model, Document } from "mongoose";

export interface IJob extends Document {
  title: string;
  description: string;
  content: string;
  file: object;
  category: Array<string>;
  validityPeriod: string;
  submissions: Array<Schema.Types.ObjectId>;
  poster: Schema.Types.ObjectId;
  portal: Schema.Types.ObjectId;
}

export interface IJobPortal extends Document {
  name: string;
  mode: string;
  admins: Array<any>;
  description: string;
  coverPhoto: object;
  duration: string;
}

const portalSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  mode: {
    type: String,
    enum: ["one-time", "long-term"],
  },

  admins: [{ type: Schema.Types.ObjectId, ref: "User" }],

  description: {
    type: String,
    required: false,
  },

  duration: {
    type: String,
    enum: ["once", "thrice", "long-term"],
  },

  coverPhoto: {
    url: String,
    publicId: String,
  },
});

const jobSchema = new Schema({
  title: {
    type: String,
    required: true,
    min: 5,
    max: 30,
  },

  description: {
    type: String,
    required: true,
    min: 10,
  },

  content: {
    type: String,
  },

  file: {
    publicId: String,
    url: String,
    fileType: String,
  },

  category: [{ type: String, required: true }],

  validityPeriod: {
    type: String,
    enum: ["one-week", "two-weeks", "three-weeks", "one-month"],
    default: "one-week",
  },

  poster: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  portal: {
    type: Schema.Types.ObjectId,
    required: true,
  },

  submissions: [
    {
      type: Schema.Types.ObjectId,
      ref: "JobApp",
    },
  ],
});

export const jobModel = model<IJob>("Job", jobSchema);
export const jobPortalModel = model<IJobPortal>("Jobportal", portalSchema);
