// apps/api/src/app/lib/textract.ts
import { TextractClient, AnalyzeDocumentCommand, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { logger } from './logger';
import { encrypt } from './encryption';

export interface TextractResult {
  rawText: string;           // Texto plano extraído
  tables: any[];             // Tablas detectadas (para resultados de laboratorio)
  forms: Record<string, string>; // Campos de formulario (clave-valor)
  confidence: number;        // Confianza promedio de extracción
}

export interface MedicalDocumentAnalysis {
  confidence: any;
  originalKey: string;
  extractedText: string;     // Encriptado
  extractedData: string;     // Encriptado (JSON con estructuras)
  analysisSummary?: string;  // Resumen generado por IA (encriptado)
  documentType: 'lab_results' | 'prescription' | 'medical_history' | 'other';
  extractedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export class TextractService {
  private static client: TextractClient;

  static initialize() {
    if (!this.client) {
      this.client = new TextractClient({
        region: process.env.AWS_REGION || 'us-west-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      logger.info('TEXTRACT', 'Cliente Textract inicializado', { region: process.env.AWS_REGION });
    }
  }

  /**
   * Procesa un documento médico usando AWS Textract
   * @param s3Key Clave del documento en S3
   * @param documentType Tipo de documento médico
   */
  static async processMedicalDocument(
    s3Key: string, 
    documentType: 'lab_results' | 'prescription' | 'medical_history' | 'other' = 'other'
  ): Promise<MedicalDocumentAnalysis> {
    this.initialize();
    
    return logger.time('TEXTRACT', 'Procesar documento médico', async () => {
      try {
        logger.debug('TEXTRACT', 'Iniciando procesamiento de documento', {
          s3Key,
          documentType,
          bucket: process.env.AWS_S3_BUCKET_NAME
        });

        // Configurar parámetros según tipo de documento
        const featureTypes = this.getFeatureTypesForDocument(documentType);
        
        const command = new AnalyzeDocumentCommand({
          Document: {
            S3Object: {
              Bucket: process.env.AWS_S3_BUCKET_NAME!,
              Name: s3Key,
            },
          },
          FeatureTypes: featureTypes,
        });

        logger.debug('TEXTRACT', 'Enviando comando a AWS Textract', { featureTypes });

        const response = await this.client.send(command);
        
        // Extraer y estructurar datos
        const result = this.extractStructuredData(response, documentType);
        
        logger.info('TEXTRACT', 'Documento procesado exitosamente', {
          s3Key,
          textLength: result.rawText.length,
          tableCount: result.tables.length,
          formFields: Object.keys(result.forms).length,
          confidence: result.confidence
        });

        // Crear objeto de análisis
        const analysis: MedicalDocumentAnalysis = {
          originalKey: s3Key,
          extractedText: encrypt(result.rawText),
          extractedData: encrypt(JSON.stringify({
            tables: result.tables,
            forms: result.forms,
            confidence: result.confidence
          })),
          documentType,
          extractedAt: new Date(),
          status: 'completed',
          confidence: result.confidence
        };

        return analysis;

      } catch (error: any) {
        logger.error('TEXTRACT', 'Error procesando documento médico', error, {
          s3Key,
          documentType,
          errorCode: error.Code,
          errorMessage: error.message
        });

        return {
          originalKey: s3Key,
          extractedText: encrypt(''), // Texto vacío encriptado
          extractedData: encrypt('{}'),
          documentType,
          extractedAt: new Date(),
          status: 'failed',
          confidence: 0,
          error: error.message || 'Error desconocido en Textract'
        };
      }
    }, { s3Key, documentType });
  }

  /**
   * Determina qué características extraer basado en el tipo de documento
   */
  private static getFeatureTypesForDocument(
    documentType: 'lab_results' | 'prescription' | 'medical_history' | 'other'
  ): ('TABLES' | 'FORMS')[] {
    switch (documentType) {
      case 'lab_results':
        return ['TABLES']; // Los resultados de laboratorio suelen ser tablas
      case 'prescription':
        return ['FORMS', 'TABLES']; // Recetas tienen campos estructurados
      case 'medical_history':
        return ['FORMS']; // Historial médico suele ser formulario
      default:
        return ['TABLES', 'FORMS']; // Ambos para documentos genéricos
    }
  }

  /**
   * Extrae datos estructurados de la respuesta de Textract
   */
  private static extractStructuredData(response: any, documentType: string): TextractResult {
    const blocks = response.Blocks || [];
    
    // Extraer texto plano
    const textBlocks = blocks.filter((block: any) => block.BlockType === 'LINE');
    const rawText = textBlocks.map((block: any) => block.Text).join('\n');
    
    // Extraer tablas (para resultados de laboratorio)
    const tables = this.extractTables(blocks);
    
    // Extraer campos de formulario
    const forms = this.extractForms(blocks);
    
    // Calcular confianza promedio
    const confidences = blocks
      .filter((block: any) => block.Confidence)
      .map((block: any) => block.Confidence);
    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((a: number, b: number) => a + b) / confidences.length 
      : 0;

    return {
      rawText,
      tables,
      forms,
      confidence: avgConfidence
    };
  }

  /**
   * Extrae tablas de los bloques de Textract
   */
  private static extractTables(blocks: any[]): any[] {
    const tables: any[] = [];
    const tableBlocks = blocks.filter(block => block.BlockType === 'TABLE');
    
    for (const tableBlock of tableBlocks) {
      const table = this.buildTable(tableBlock, blocks);
      if (table.rows.length > 0) {
        tables.push(table);
      }
    }
    
    return tables;
  }

  /**
   * Construye una tabla estructurada
   */
  private static buildTable(tableBlock: any, allBlocks: any[]): any {
    const cells = tableBlock.Relationships
      ?.flatMap((rel: any) => rel.Ids || [])
      .map((id: string) => allBlocks.find(b => b.Id === id))
      .filter(Boolean) || [];

    const rows: any[] = [];
    let currentRowIndex = 0;
    let currentRow: any[] = [];

    cells.forEach((cell: any) => {
      if (!cell.RowIndex) return;
      
      if (cell.RowIndex !== currentRowIndex) {
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRowIndex = cell.RowIndex;
        currentRow = [];
      }

      const cellText = this.getCellText(cell, allBlocks);
      currentRow.push({
        text: cellText,
        row: cell.RowIndex,
        column: cell.ColumnIndex,
        confidence: cell.Confidence
      });
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return {
      rows,
      cellCount: cells.length,
      confidence: tableBlock.Confidence || 0
    };
  }

  /**
   * Extrae texto de una celda
   */
  private static getCellText(cell: any, allBlocks: any[]): string {
    if (!cell.Relationships) return '';
    
    const wordIds = cell.Relationships.flatMap((rel: any) => rel.Ids || []);
    const words = wordIds
      .map((id: string) => allBlocks.find(b => b.Id === id))
      .filter((block: { BlockType: string; }) => block && block.BlockType === 'WORD')
      .map((word: any) => word.Text)
      .join(' ');
    
    return words;
  }

  /**
   * Extrae campos de formulario
   */
  private static extractForms(blocks: any[]): Record<string, string> {
    const forms: Record<string, string> = {};
    const keyValueSets = blocks.filter(block => block.BlockType === 'KEY_VALUE_SET');
    
    // Mapear bloques por ID para acceso rápido
    const blockMap = new Map();
    blocks.forEach(block => blockMap.set(block.Id, block));
    
    keyValueSets.forEach((block: any) => {
      if (block.EntityTypes?.includes('KEY')) {
        const keyText = this.getFormFieldText(block, blockMap);
        const valueBlock = this.findValueBlock(block, keyValueSets, blockMap);
        const valueText = valueBlock ? this.getFormFieldText(valueBlock, blockMap) : '';
        
        if (keyText && keyText.trim()) {
          forms[keyText.trim()] = valueText.trim();
        }
      }
    });
    
    return forms;
  }

  /**
   * Encuentra el bloque VALUE asociado a un KEY
   */
  private static findValueBlock(
    keyBlock: any, 
    keyValueSets: any[], 
    blockMap: Map<string, any>
  ): any | null {
    const valueRelationship = keyBlock.Relationships?.find((rel: any) => rel.Type === 'VALUE');
    if (!valueRelationship) return null;
    
    const valueId = valueRelationship.Ids?.[0];
    if (!valueId) return null;
    
    return keyValueSets.find(block => 
      block.Id === valueId && block.EntityTypes?.includes('VALUE')
    );
  }

  /**
   * Extrae texto de un campo de formulario
   */
  private static getFormFieldText(block: any, blockMap: Map<string, any>): string {
    const wordIds = block.Relationships
      ?.filter((rel: any) => rel.Type === 'CHILD')
      .flatMap((rel: any) => rel.Ids || []) || [];
    
    const words = wordIds
      .map((id: string) => blockMap.get(id))
      .filter((word: { BlockType: string; }) => word && word.BlockType === 'WORD')
      .map((word: any) => word.Text)
      .join(' ');
    
    return words;
  }

  /**
   * Procesa múltiples documentos en paralelo
   */
  static async processDocumentsBatch(
    documents: Array<{ s3Key: string; documentType: string }>
  ): Promise<MedicalDocumentAnalysis[]> {
    const promises = documents.map(doc => 
      this.processMedicalDocument(doc.s3Key, doc.documentType as any)
    );
    
    return Promise.all(promises);
  }

  /**
   * Método simple para solo texto (sin análisis de tablas/formularios)
   */
  static async extractSimpleText(s3Key: string): Promise<string> {
    this.initialize();
    
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Name: s3Key,
          },
        },
      });

      const response = await this.client.send(command);
      const textBlocks = response.Blocks?.filter((block: any) => block.BlockType === 'LINE') || [];
      const text = textBlocks.map((block: any) => block.Text).join('\n');
      
      return text;
    } catch (error) {
      logger.error('TEXTRACT', 'Error extrayendo texto simple', error as Error, { s3Key });
      return '';
    }
  }

  /**
   * Determina el tipo de documento basado en el nombre del archivo
   */
  static determineDocumentType(fileName: string): 'lab_results' | 'prescription' | 'medical_history' | 'other' {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('lab') || lowerName.includes('resultado') || lowerName.includes('análisis') || lowerName.includes('analisis')) {
      return 'lab_results';
    }
    
    if (lowerName.includes('receta') || lowerName.includes('prescripción') || lowerName.includes('prescripcion') || lowerName.includes('medicamento')) {
      return 'prescription';
    }
    
    if (lowerName.includes('historial') || lowerName.includes('médico') || lowerName.includes('medico') || lowerName.includes('clínico') || lowerName.includes('clinico')) {
      return 'medical_history';
    }
    
    return 'other';
  }
}