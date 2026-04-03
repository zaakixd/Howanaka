import { Schema, model, Types } from "mongoose";

const ActivityLogSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  type: { type: String, required: true }, // e.g. "member_join", "member_leave", "mod_ban", "msg_delete"
  userId: { type: String, default: null },
  targetId: { type: String, default: null },
  details: { type: String, required: true },
}, { timestamps: true });

export const ActivityLogModel = model("ActivityLog", ActivityLogSchema);

export function formatLog(doc: InstanceType<typeof ActivityLogModel> & { _id: Types.ObjectId }) {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    type: doc.type,
    userId: doc.userId ?? null,
    targetId: doc.targetId ?? null,
    details: doc.details,
    createdAt: (doc as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
