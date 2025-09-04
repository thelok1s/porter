import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "@/lib/sequelize";

export class Post extends Model<
  InferAttributes<Post>,
  InferCreationAttributes<Post>
> {
  declare id: CreationOptional<number>;
  declare vk_id: number;
  declare vk_author_id: number | null;
  declare tg_id: number;
  declare discussion_tg_id: number | null;
  declare tg_author_id: string | null;
  declare created_at: number | null;
  declare text_hash: string | null;
  declare attachments: string | null;
}

Post.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    vk_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    vk_author_id: { type: DataTypes.INTEGER, allowNull: true },
    tg_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    discussion_tg_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    tg_author_id: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.INTEGER, allowNull: true },
    text_hash: { type: DataTypes.TEXT, allowNull: true },
    attachments: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "posts",
    timestamps: false, // storing created_at explicitly
    indexes: [
      { name: "idx_posts_vk_id", fields: ["vk_id"] },
      { name: "idx_posts_tg_id", fields: ["tg_id"] },
    ],
  },
);
