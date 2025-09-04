import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "@/lib/sequelize";
import { Post } from "./post.schema";

export class Reply extends Model<
  InferAttributes<Reply>,
  InferCreationAttributes<Reply>
> {
  declare id: CreationOptional<number>;
  declare vk_post_id: number | null; // references Post.vk_id (targetKey)
  declare vk_reply_id: number | null;
  declare vk_author_id: number | null;
  declare tg_reply_id: number | null;
  declare discussion_tg_id: number | null; // references Post.discussion_tg_id (targetKey)
  declare tg_author_id: number | null;
  declare created_at: Date | null;
  declare text_hash: string | null;
  declare attachments: unknown | null;
}

Reply.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    vk_post_id: { type: DataTypes.INTEGER, allowNull: true },
    vk_reply_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    vk_author_id: { type: DataTypes.INTEGER, allowNull: true },
    tg_reply_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    discussion_tg_id: { type: DataTypes.INTEGER, allowNull: true },
    tg_author_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    text_hash: { type: DataTypes.TEXT, allowNull: true },
    attachments: { type: DataTypes.JSON, allowNull: true },
  },
  {
    sequelize,
    tableName: "replies",
    timestamps: false,
    indexes: [{ name: "idx_replies_vk_post_id", fields: ["vk_post_id"] }],
  },
);

// 1) Replies link to Posts by vk_post_id -> Posts.vk_id
Post.hasMany(Reply, {
  as: "repliesByVkPost",
  foreignKey: "vk_post_id",
  sourceKey: "vk_id",
});
Reply.belongsTo(Post, {
  as: "postByVkPost",
  foreignKey: "vk_post_id",
  targetKey: "vk_id",
});

// 2) Replies link to Posts by discussion_tg_id -> Posts.discussion_tg_id
Post.hasMany(Reply, {
  as: "repliesByDiscussion",
  foreignKey: "discussion_tg_id",
  sourceKey: "discussion_tg_id",
});
Reply.belongsTo(Post, {
  as: "postByDiscussion",
  foreignKey: "discussion_tg_id",
  targetKey: "discussion_tg_id",
});
