import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';

export function parseCSVStream(
  source: string | Readable,
  onRow: (row: any, rowNumber: number) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    let stream: Readable;

    if (source instanceof Readable) {
      stream = source;
    } else if (typeof source === 'string') {
      const isFilePath = source.length < 260 && !source.includes('\n') && fs.existsSync(source);
      if (isFilePath) {
        stream = fs.createReadStream(source);
      } else {
        stream = Readable.from(source);
      }
    } else {
      return reject(new Error('Invalid CSV source type'));
    }

    const parser = stream.pipe(csv());
    let rowNumber = 0;

    parser.on('data', async (row) => {
      rowNumber++;
      
      parser.pause();
      if ('pause' in stream && typeof stream.pause === 'function') {
        stream.pause();
      }

      try {
        await onRow(row, rowNumber);
        
        parser.resume();
        if ('resume' in stream && typeof stream.resume === 'function') {
          stream.resume();
        }
      } catch (error) {
        parser.destroy();
        stream.destroy();
        reject(error);
      }
    });

    parser.on('end', () => {
      resolve();
    });

    parser.on('error', (err) => {
      reject(err);
    });
  });
}
