import { SequelizeModuleAsyncOptions } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';

// async config so it reads env vars after ConfigModule has loaded
export const dbConfig: SequelizeModuleAsyncOptions = {
  imports:    [ConfigModule],
  inject:     [ConfigService],

  // useFactory is a function that Sequelize needs to be configured with values from your .env.
  useFactory: (config: ConfigService) => ({
    dialect:  'postgres',
    host:     config.get<string>('POSTGRES_HOST'),
    port:     config.get<number>('POSTGRES_PORT'),
    username: config.get<string>('POSTGRES_USER'),
    password: config.get<string>('POSTGRES_PASSWORD'),
    database: config.get<string>('POSTGRES_DB'),
    // auto-discovers all .model.ts files and creates tables from them
    autoLoadModels: true,
    // synchronize=true auto-creates tables from models — fine for learning, never for production
    synchronize: true,
  }),
};