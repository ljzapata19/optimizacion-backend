import { Module } from '@nestjs/common';
import { OptimizeController } from './optimize/optimize.controller';
import { OptimizeService } from './optimize/optimize.service';
import { WatsonService } from './optimize/watson.service';

@Module({
  imports: [],
  controllers: [OptimizeController],
  providers: [OptimizeService, WatsonService],
})
export class AppModule {}

