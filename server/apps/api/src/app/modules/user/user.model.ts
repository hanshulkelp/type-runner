import {
  Column,
  Model,
  Table,
  PrimaryKey,
  Default,
  Unique,
  DataType,
  CreatedAt,
} from 'sequelize-typescript';

@Table({ tableName: 'users' })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Unique
  @Column
  email: string;

  @Unique
  @Column
  username: string;

  // named passwordHash so it's never confused with a plain-text password
  @Column({ field: 'password_hash' })
  passwordHash: string;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;
}