require('dotenv').config();
const { list } = require('@vercel/blob');
const { pool } = require('../../database/db');

// Dicionário de descrições (Reutilizando o seu)
const EXERCISE_DATA = {
    'Abdominal Bicicleta': {
        desc: 'Exercício abdominal dinâmico que foca nos músculos oblíquos e reto abdominal.',
        exec: 'Deite-se de costas, mãos atrás da cabeça. Traga o joelho direito em direção ao cotovelo esquerdo enquanto estende a perna esquerda. Alterne os lados.',
        alvo: 'Intermediário/Avançado'
    },
    'Agachamento Livre': {
        desc: 'O movimento fundamental de agachar usando apenas o peso do corpo.',
        exec: 'Pés na largura dos ombros, agache jogando o quadril para trás e para baixo.',
        alvo: 'Iniciante'
    },
    // ... O script tentará usar descrições genéricas se não encontrar aqui
};

async function syncBlobToDB() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("❌ ERRO: BLOB_READ_WRITE_TOKEN ausente no .env");
        return;
    }

    console.log("⏳ Conectando ao Vercel Blob (pasta 'assets/')...");

    try {
        // 1. Lista arquivos na pasta 'assets/' do Blob
        const { blobs } = await list({
            prefix: 'assets/',
            limit: 1000,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log(`��� Encontrados ${blobs.length} arquivos no Blob.`);

        if (blobs.length === 0) {
            console.log("⚠️ Nenhuma imagem encontrada na pasta 'assets/'. Verifique se o nome da pasta está correto no Blob.");
        }

        let count = 0;

        for (const blob of blobs) {
            // Exemplo de pathname: "assets/Agachamento Livre - Image.png"
            // Extrai o nome do arquivo
            const fileName = blob.pathname.split('/').pop(); // "Agachamento Livre - Image.png"
            
            // Limpa o nome para o Banco (Remove extensão e sufixos)
            const cleanName = fileName
                .replace(' - Image', '')
                .replace('- Image', '')
                .replace('.png', '')
                .replace('.jpg', '')
                .replace('.jpeg', '')
                .trim();

            if (!cleanName) continue;

            // Tenta encontrar descrição ou usa genérica
            // Tenta casar o nome limpo ou o nome do arquivo original
            const info = EXERCISE_DATA[cleanName] || EXERCISE_DATA[fileName] || {
                desc: `Exercício de ${cleanName}.`,
                exec: 'Realize o movimento com postura correta e carga adequada.',
                alvo: 'Geral'
            };

            // Insere ou Atualiza no Banco
            // Usamos ON CONFLICT (se tiver constraint unique no nome) ou verificamos antes
            const check = await pool.query("SELECT id FROM exercise_library WHERE name = $1", [cleanName]);

            if (check.rows.length > 0) {
                // Atualiza URL e dados
                await pool.query(`
                    UPDATE exercise_library SET 
                        image_url = $1, description = $2, execution_instructions = $3, target_audience = $4 
                    WHERE id = $5
                `, [blob.url, info.desc, info.exec, info.alvo, check.rows[0].id]);
                console.log(`��� Atualizado: ${cleanName}`);
            } else {
                // Insere novo
                await pool.query(`
                    INSERT INTO exercise_library (name, image_url, description, execution_instructions, target_audience, category)
                    VALUES ($1, $2, $3, $4, $5, 'Geral')
                `, [cleanName, blob.url, info.desc, info.exec, info.alvo]);
                console.log(`✅ Criado: ${cleanName}`);
            }
            count++;
        }

        console.log(`��� Sincronização concluída! ${count} exercícios processados.`);

    } catch (error) {
        console.error("❌ Erro na sincronização:", error);
    } finally {
        await pool.end();
    }
}

syncBlobToDB();
