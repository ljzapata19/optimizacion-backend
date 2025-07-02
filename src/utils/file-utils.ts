import { Parser } from 'json2csv';
import * as csv from 'csvtojson';

export const toCSV = (jsonData: any[]): string => {
  const parser = new Parser();
  return parser.parse(jsonData);
};

export const fromCSV = async (filePath: string): Promise<any[]> => {
  return await csv().fromFile(filePath);
};
