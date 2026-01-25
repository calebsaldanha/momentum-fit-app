const { GoogleGenerativeAI } = require("@google/generative-ai");
const notificationService = require('./notificationService');

// CORREÇÃO DE SEGURANÇA: Removido fallback hardcoded
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getChatResponse(userId, userMessage) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const chat = model.startChat({ history: [] });
        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("Erro API Gemini:", error);
        
        // Notificar Admin sobre falha na IA
        await notificationService.notify({
            userId: 'ADMIN_GROUP',
            type: 'ai_error',
            title: 'Falha na IA',
            message: `Erro ao processar mensagem do user ${userId}: ${error.message}`,
            link: '/admin/ia-audit',
            data: { errorMsg: error.message }
        });

        return "⚠️ Minha conexão neural falhou. Os administradores foram notificados.";
    }
}
module.exports = { getChatResponse };
