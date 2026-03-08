import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './user.model';

@Injectable()
export class UsersService {
  constructor(
    // injects the User model so we can query the users table
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findOne({ where: { id } });
  }

  async createUser(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    return this.userModel.create(data);
  }
}