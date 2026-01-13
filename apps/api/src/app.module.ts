import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CbtModule } from './cbt/cbt.module';
import { PrismaModule } from './prisma/prisma.module';
import { SisModule } from './sis/sis.module';
import { TenantsModule } from './tenants/tenants.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [PrismaModule, AuthModule, SisModule, CbtModule, TenantsModule, ResultsModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
