import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { sequelize } from "@/lib/sequelize";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare tg_id: number;
  declare vk_id: number | null;
  declare role: string;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tg_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    vk_id: { type: DataTypes.INTEGER, allowNull: true, unique: true },
    role: { type: DataTypes.TEXT, allowNull: false, defaultValue: "moderator" },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: false,
  },
);
