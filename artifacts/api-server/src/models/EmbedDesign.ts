import { Schema, model, Types } from "mongoose";

// Sub-schema for embed field
const EmbedFieldSchema = new Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  inline: { type: Boolean, default: false },
}, { _id: false });

// Main embed design schema
const EmbedDesignSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  title: { type: String, default: null },
  description: { type: String, default: null },
  color: { type: String, default: null },
  thumbnailUrl: { type: String, default: null },
  imageUrl: { type: String, default: null },
  footerText: { type: String, default: null },
  footerIconUrl: { type: String, default: null },
  authorName: { type: String, default: null },
  authorIconUrl: { type: String, default: null },
  authorUrl: { type: String, default: null },
  fields: { type: [EmbedFieldSchema], default: [] },
}, { timestamps: true });

export const EmbedDesignModel = model("EmbedDesign", EmbedDesignSchema);

// Helper to format embed document to API shape
export function formatEmbed(doc: InstanceType<typeof EmbedDesignModel> & { _id: Types.ObjectId }) {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    name: doc.name,
    title: doc.title ?? null,
    description: doc.description ?? null,
    color: doc.color ?? null,
    thumbnailUrl: doc.thumbnailUrl ?? null,
    imageUrl: doc.imageUrl ?? null,
    footerText: doc.footerText ?? null,
    footerIconUrl: doc.footerIconUrl ?? null,
    authorName: doc.authorName ?? null,
    authorIconUrl: doc.authorIconUrl ?? null,
    authorUrl: doc.authorUrl ?? null,
    fields: doc.fields ?? [],
    createdAt: (doc as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: (doc as any).updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
