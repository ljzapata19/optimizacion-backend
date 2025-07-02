import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fromCSV } from '../utils/file-utils';
import { S3 } from 'ibm-cos-sdk';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class WatsonService {
  private cos: S3;
  private token: string;
  

  constructor() {
    this.cos = new S3({
      endpoint: `https://${process.env.ENDPOINT_REGION}`,
      apiKeyId: process.env.IBM_API_KEY,
      ibmAuthEndpoint: 'https://iam.cloud.ibm.com/identity/token',
    });
  }

  public async getToken(): Promise<string> {
    if (this.token) return this.token;

    const params = new URLSearchParams();
    params.append('apikey', process.env.IBM_API_KEY!);
    params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');

    const res = await axios.post(
      'https://iam.cloud.ibm.com/identity/token',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    this.token = res.data.access_token;
    return this.token;
  }

  async uploadFile(fileName: string): Promise<void> {
    const filePath = path.resolve(fileName);
    const fileContent = fs.readFileSync(filePath);

    await this.cos
      .putObject({
        Bucket: process.env.BUCKET_NAME!,
        Key: fileName,
        Body: fileContent,
      })
      .promise();
    console.log(`✅ Subido al bucket: ${fileName}`);
  }

  async runJob(): Promise<string> {
    const token = await this.getToken();

    try {
      const res = await axios.post(
        `https://api.dataplatform.cloud.ibm.com/v2/jobs/${process.env.JOB_ID}/runs?space_id=${process.env.SPACE_ID}`,
        {}, // cuerpo vacío
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const jobRunId = res.data.metadata.asset_id;
      console.log(`🚀 Job lanzado: ${jobRunId}`);
      return jobRunId;

    } catch (error: any) {
      console.error('❌ Error lanzando el job:', error.response?.data || error.message);
      throw new Error('Error lanzando el job en IBM Watson ML');
    }
  }



  async waitForCompletion(jobRunId: string): Promise<void> {
    const token = await this.getToken();
    let status = '';
    let tries = 0;

    do {
      await new Promise((r) => setTimeout(r, 5000)); // esperar 5 segundos

      const res = await axios.get(
        `https://api.dataplatform.cloud.ibm.com/v2/jobs/${process.env.JOB_ID}/runs/${jobRunId}?space_id=${process.env.SPACE_ID}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      status = res.data.entity.job_run.state;
      //status.toLowerCase();
      console.log(`⏳ Estado del Job: ${status} (intento ${++tries})`);

      if (status === 'Completed') break;
      if (status === 'failed') throw new Error('❌ El job falló en IBM Watson');

    } while (true); // bucle hasta que se cumpla completed o failed

    console.log('✅ Job completado con éxito');
  }



  async downloadCSV(fileName: string): Promise<any[]> {
    const dest = path.resolve(fileName);
    const data = await this.cos
      .getObject({
        Bucket: process.env.BUCKET_NAME!,
        Key: fileName,
      })
      .promise();

    fs.writeFileSync(dest, data.Body as Buffer);
    console.log(`⬇️ Archivo descargado: ${fileName}`);

    return await fromCSV(dest);
  }
}
