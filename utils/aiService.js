const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../database/db');

// Usa a chave do ambiente ou a fornecida
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyARoaW9QAA-3PSNztzJNpVZR10WQdcszTc';
const genAI = new GoogleGenerativeAI(API_KEY);

async function getChatResponse(userId, userMessage) {
    try {
        // ATUALIZADO: gemini-pro -> gemini-1.5-flash (Mais rápido e estável para chat)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        const systemInstruction = `
            Você é o Momentum AI, um personal trainer virtual da plataforma Momentum Fit.
            Seja motivador, breve e direto. Use emojis.
            O aluno está perguntando sobre treinos ou saúde.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "model", parts: [{ text: "Entendido! Sou o Momentum AI. Vamos treinar!" }] },
            ],
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // Log auditoria (sem quebrar se a tabela nao existir)
        try {
            await db.query(
                "INSERT INTO ia_logs (user_id, prompt, response, tokens_used) VALUES ($1, $2, $3, $4)",
                [userId, userMessage, response, userMessage.length]
            );
        } catch(e) { console.log('Erro ao salvar log IA:', e.message); }

        return response;
    } catch (error) {
        console.error("Erro na API Gemini:", error);
        return "⚠️ Minha conexão neural falhou momentaneamente. Tente novamente.";
    }
}

module.exports = { getChatResponse };
