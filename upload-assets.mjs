import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Caminho da sua pasta
const IMAGES_DIR = 'C:/Users/CalebSaldanha/OneDrive/Área de Trabalho/Images Exerc - Momentum';

// Função para buscar arquivos recursivamente (nativa do Node)
function getFiles(dir) {
  try {
    const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
    return files
      .filter(file => file.isFile())
      .map(file => path.join(file.parentPath || file.path, file.name));
  } catch (err) {
    console.error("Erro ao ler diretório:", err.message);
    return [];
  }
}

async function uploadImages() {
  console.log(`🔍 Procurando imagens em: "${IMAGES_DIR}"`);

  const files = getFiles(IMAGES_DIR);

  if (files.length === 0) {
    console.log("⚠️ Nenhuma imagem encontrada ou caminho incorreto.");
    return;
  }

  console.log(`📂 Encontrados ${files.length} arquivos. Iniciando upload...`);

  for (const filePath of files) {
    const filename = path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    try {
      // Cria a pasta assets/ no blob
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