import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
// CORREÇÃO AQUI: Importação compatível com CommonJS/ESM mistos no Windows
import globPkg from 'glob';
const { glob } = globPkg;
import 'dotenv/config';

// Caminho da sua pasta
const IMAGES_DIR = 'C:/Users/CalebSaldanha/OneDrive/Área de Trabalho/Images Exerc - Momentum';

async function uploadImages() {
  console.log(`🔍 Procurando imagens em: "${IMAGES_DIR}"`);

  // Busca os arquivos
  const files = await glob(`${IMAGES_DIR}/**/*`, { nodir: true });

  if (!files || files.length === 0) {
    console.log("⚠️ Nenhuma imagem encontrada. Verifique se o caminho está correto.");
    return;
  }

  console.log(`📂 Encontrados ${files.length} arquivos. Iniciando upload...`);

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    try {
      const blobPath = `assets/${filename}`; 
      
      const blob = await put(blobPath, fileContent, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      console.log(`✅ Uploaded: ${filename}`);
      console.log(`   URL: ${blob.url}`);
    } catch (error) {
      console.error(`❌ Erro ao subir ${filename}:`, error.message);
    }
  }
}

uploadImages();