const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../database/db');

// Usa a chave fornecida ou do ambiente
const API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyARoaW9QAA-3PSNztzJNpVZR10WQdcszTc';
const genAI = new GoogleGenerativeAI(API_KEY);

async function getChatResponse(userId, userMessage) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});

        // Contexto do sistema (Personal Trainer)
        const systemInstruction = `
            Você é o Momentum AI, um personal trainer virtual altamente qualificado e motivador.
            Seu objetivo é ajudar o aluno com dúvidas sobre execução de exercícios, nutrição básica e motivação.
            Seja direto, use emojis ocasionalmente e mantenha um tom profissional mas acessível.
            Nunca prescreva dietas médicas ou tratamentos de lesões graves, recomende um profissional presencial nesses casos.
        `;

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemInstruction }],
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido! Estou pronto para atuar como o Momentum AI. Como posso ajudar hoje?" }],
                },
            ],
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();

        // Logar na auditoria
        await db.query(
            "INSERT INTO ia_logs (user_id, prompt, response, tokens_used) VALUES ($1, $2, $3, $4)",
            [userId, userMessage, text, userMessage.length + text.length] // Estimativa simples de tokens
        );

        return text;
    } catch (error) {
        console.error("Erro na API Gemini:", error);
        return "Desculpe, estou com uma sobrecarga neural no momento. Tente novamente em alguns instantes.";
    }
}

module.exports = { getChatResponse };
