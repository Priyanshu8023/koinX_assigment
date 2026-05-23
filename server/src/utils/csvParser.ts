import fs from 'fs';
import csv from 'csv-parser';

/**
 * Streams a CSV file line-by-line, invoking the callback for each row.
 * Handles stream backpressure by pausing/resuming during asynchronous callbacks.
 */
export function parseCSVStream(
  filePath: string,
  onRow: (row: any, rowNumber: number) => Promise<void>
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found at path: ${filePath}`));
    }

    const readStream = fs.createReadStream(filePath);
    const parser = readStream.pipe(csv());
    let rowNumber = 0;

    parser.on('data', async (row) => {
      rowNumber++;
      
       
      parser.pause();
      readStream.pause();

      try {
        await onRow(row, rowNumber);
        
        parser.resume();
        readStream.resume();
      } catch (error) {
        parser.destroy();
        readStream.destroy();
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
