import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { User } from '../user/user.model';

@Table({ tableName: 'leaderboard' })
export class Leaderboard extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  // foreign key linking this row to a specific user
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  userId: string;

  // all-time best WPM this user has ever achieved
  @Default(0)
  @Column(DataType.INTEGER)
  bestWpm: number;

  // rolling average accuracy across all races
  @Default(0)
  @Column(DataType.DECIMAL(5, 2))
  avgAccuracy: number;

  // total number of races this user has completed
  @Default(0)
  @Column(DataType.INTEGER)
  racesPlayed: number;

  // total number of races this user has won
  @Default(0)
  @Column(DataType.INTEGER)
  wins: number;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;

  // allows joining user data (username) when querying leaderboard
  @BelongsTo(() => User)
  user: User;
}