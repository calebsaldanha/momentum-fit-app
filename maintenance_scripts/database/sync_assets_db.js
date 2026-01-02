require('dotenv').config();
const { list } = require('@vercel/blob');
const { pool } = require('../../database/db');

// Dicionário de descrições (Baseado no seu seed original)
const EXERCISE_DATA = {
    'Abdominal Bicicleta': { desc: 'Foco nos oblíquos e reto abdominal.', exec: 'Pedale no ar levando o cotovelo ao joelho oposto.', alvo: 'Intermediário' },
    'Abdominal Crunch': { desc: 'Fortalecimento abdominal superior.', exec: 'Eleve as omoplatas do chão contraindo o abdômen.', alvo: 'Iniciante' },
    'Afundo': { desc: 'Exercício unilateral para pernas e glúteos.', exec: 'Dê um passo à frente e agache até 90 graus.', alvo: 'Todos' },
    'Agachamento Livre': { desc: 'Agachamento fundamental com peso do corpo.', exec: 'Pés na largura dos ombros, desça o quadril para trás.', alvo: 'Iniciante' },
    'Agachamento Búlgaro': { desc: 'Unilateral avançado com pé de trás apoiado.', exec: 'Apoie o pé de trás no banco e agache.', alvo: 'Avançado' },
    'Barra Fixa': { desc: 'Exercício completo para costas.', exec: 'Pendure-se e puxe o queixo até a barra.', alvo: 'Avançado' },
    'Flexão de Braços': { desc: 'Peitoral e tríceps com peso do corpo.', exec: 'Corpo em prancha, desça o peito até o chão.', alvo: 'Todos' },
    'Prancha': { desc: 'Isometria para o core.', exec: 'Apoie antebraços e ponta dos pés, mantenha o corpo reto.', alvo: 'Todos' },
    'Rosca Direta': { desc: 'Clássico para bíceps.', exec: 'Segure a barra/halter e flexione os cotovelos.', alvo: 'Todos' },
    'Supino Reto': { desc: 'Construtor de peitoral.', exec: 'Empurre a carga para cima na linha do peito.', alvo: 'Todos' },
    'Terra (Deadlift)': { desc: 'Força total para cadeia posterior.', exec: 'Tire a carga do chão mantendo a coluna neutra.', alvo: 'Avançado' },
    'Tríceps Corda': { desc: 'Isolamento de tríceps na polia.', exec: 'Puxe a corda para baixo abrindo as mãos no final.', alvo: 'Todos' }
};

async function syncAssets() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error("❌ ERRO: Token do Blob não encontrado no .env");
        process.exit(1);
    }

    console.log("⏳ Buscando arquivos na pasta 'assets/' do Blob...");

    try {
        // Lista arquivos na pasta assets
        const { blobs } = await list({
            prefix: 'assets/',
            limit: 500,
            token: process.env.BLOB_READ_WRITE_TOKEN
        });

        console.log(`��� Encontrados ${blobs.length} arquivos.`);

        let updated = 0;
        let created = 0;

        for (const blob of blobs) {
            // Nome do arquivo: assets/Exercicio - Image.png -> "Exercicio"
            const filename = blob.pathname.split('/').pop();
            // Limpeza do nome para usar como Título
            const cleanName = filename
                .replace('assets/', '')
                .replace(/ - Image.*/i, '') // Remove sufixos comuns
                .replace(/\.(png|jpg|jpeg|webp)/i, '')
                .replace(/-/g, ' ')
                .trim();
            
            if (!cleanName) continue;

            // Tenta achar descrição correspondente (busca parcial)
            let info = { 
                desc: `Exercício de ${cleanName}.`, 
                exec: 'Execute com postura correta.', 
                alvo: 'Geral' 
            };
            
            // Procura chave no dicionário que esteja contida no nome do arquivo
            const key = Object.keys(EXERCISE_DATA).find(k => cleanName.includes(k) || k.includes(cleanName));
            if (key) info = EXERCISE_DATA[key];

            // Verifica se já existe no banco
            const res = await pool.query("SELECT id FROM exercise_library WHERE name = $1", [cleanName]);

            if (res.rows.length > 0) {
                // Atualiza URL da imagem e dados
                await pool.query(`
                    UPDATE exercise_library SET 
                    image_url = $1, description = $2, execution_instructions = $3, target_audience = $4
                    WHERE id = $5
                `, [blob.url, info.desc, info.exec, info.alvo, res.rows[0].id]);
                updated++;
            } else {
                // Cria novo
                await pool.query(`
                    INSERT INTO exercise_library (name, image_url, description, execution_instructions, target_audience, category)
                    VALUES ($1, $2, $3, $4, $5, 'Geral')
                `, [cleanName, blob.url, info.desc, info.exec, info.alvo]);
                created++;
            }
        }

        console.log(`✅ Concluído! Criados: ${created}, Atualizados: ${updated}`);
        console.log("Agora a rota /workouts/create deve encontrar esses exercícios.");

    } catch (err) {
        console.error("❌ Erro:", err);
    } finally {
        await pool.end();
    }
}

syncAssets();
