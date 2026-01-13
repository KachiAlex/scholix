import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ResultsController],
  providers: [ResultsService],
})
export class ResultsModule {}
