import { Controller, Post, Body, Get, UseInterceptors, UploadedFile } from '@nestjs/common';
import { OptimizeService } from './optimize.service'; // ← ¡ruta correcta!
import { OptimizeDto } from '../dto/optimize.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
@Controller('optimize')
export class OptimizeController {
  constructor(private readonly optimizeService: OptimizeService) {}

    @Get('test-ibm')
    async testConexionWatson() {
    return this.optimizeService.testConexion();
    }

    @Post()
    async runOptimization(@Body() optimizeDto: OptimizeDto) {
        return this.optimizeService.processOptimization(optimizeDto);
    }

    @Get('/executions')
    getAllExecutions() {
      return this.optimizeService.getAllExecutions();
}

}
