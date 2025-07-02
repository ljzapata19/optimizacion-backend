import { Injectable } from '@nestjs/common';
import { WatsonService } from './watson.service';
import { toCSV, fromCSV } from '../utils/file-utils';
import { writeFileSync } from 'fs';
import { readFileSync, existsSync} from 'fs';
import * as path from 'path';

@Injectable()
export class OptimizeService {
  constructor(private readonly watson: WatsonService) {}

  async testConexion() {
    const token = await this.watson.getToken();
    console.log('✅ Token obtenido:', token.slice(0, 20) + '...');

    const testFile = 'test.csv';
    const fs = require('fs');
    fs.writeFileSync(testFile, 'col1,col2\nvalor1,valor2');

    await this.watson.uploadFile(testFile);

    return { mensaje: 'Conexión exitosa con IBM y archivo subido' };
  }

  
  async processOptimization({ RawMaterials, Costs, Parameters }) {
      console.log('RawMaterials:', RawMaterials);
      console.log('Costs:', Costs);
      console.log('Parameters:', Parameters);
    if (!RawMaterials || RawMaterials.length === 0) {
    throw new Error('RawMaterials está vacío');
    }
    if (!Costs || Costs.length === 0) {
      throw new Error('Costs está vacío');
    }
    if (!Parameters) {
      throw new Error('Parameters está vacío');
    }

    writeFileSync('RawMaterials.csv', toCSV(RawMaterials));
    writeFileSync('Costs.csv', toCSV(Costs));
    writeFileSync('Parameters.csv', toCSV([Parameters]));

    await this.watson.uploadFile('RawMaterials.csv');
    await this.watson.uploadFile('Costs.csv');
    await this.watson.uploadFile('Parameters.csv');

    const jobRunId = await this.watson.runJob();
    await this.watson.waitForCompletion(jobRunId);

    const maxBenef = await this.watson.downloadCSV('maxB.csv');
    const buySolution = await this.watson.downloadCSV('BuySolution.csv');
    const useSolution = await this.watson.downloadCSV('UseSolution.csv');
    const storeSolution = await this.watson.downloadCSV('StoreSolution.csv');


    const ejecucionesPath = path.resolve('ejecuciones.json');

    // Leer ejecuciones anteriores (si existen)
    interface Ejecucion {
      id: number;
      fecha: string;
      maxBeneficio: number;
      buySolution: any[];
      useSolution: any[];
      storeSolution: any[];
    }
    let ejecuciones: Ejecucion[] = [];
    if (existsSync(ejecucionesPath)) {
      try {
        const data = readFileSync(ejecucionesPath, 'utf8');
        ejecuciones = JSON.parse(data);
      } catch (err) {
        console.error('⚠️ Error al leer ejecuciones.json:', err.message);
        ejecuciones = []; // fallback seguro
      }
    }

    // Crear nueva ejecución
    const nuevaEjecucion = {
      id: ejecuciones.length + 1,
      fecha: new Date().toLocaleString(),
      maxBeneficio: parseFloat(maxBenef[0].maxBeneficio),
      buySolution,
      useSolution,
      storeSolution
    };

    // Guardar en lista
    ejecuciones.push(nuevaEjecucion);
    writeFileSync(ejecucionesPath, JSON.stringify(ejecuciones, null, 2));
    return {
      maxBeneficio: maxBenef,
      buySolution: buySolution,
      useSolution: useSolution,
      storeSolution: storeSolution
    };
  }

  /*async uploadAnyFile(fileName: string, fileContent: Buffer): Promise<string> {
  await this.watson.uploadFileObject(fileName, fileContent);
  return `Archivo ${fileName} subido correctamente`;
  }*/
  getAllExecutions() {
    const fs = require('fs');
    const path = require('path');
    const ejecucionesPath = path.resolve('ejecuciones.json');

    if (!fs.existsSync(ejecucionesPath)) return [];

    const data = fs.readFileSync(ejecucionesPath, 'utf8');
    return JSON.parse(data);
  }

}
