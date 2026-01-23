const db = require('../database/db');
const { createNotification } = require('./notificationService');
const { sendEmail } = require('./emailService');

// Função para gerar Payload PIX (Simplificado para o Scheduler)
// Em produção, isso viria de uma lib compartilhada
const generatePixCopyPaste = (amount, user) => {
    return `00020126330014BR.GOV.BCB.PIX0111084dee93-9dc5-44e7-aa2e-3eff8623651d520400005303986540${amount.toFixed(2).length}${amount.toFixed(2)}5802BR5913Momentum Fit6009SAO PAULO62070503***6304`; 
};

async function runDailyChecks() {
    console.log("--- Iniciando Verificações Diárias (Scheduler) ---");
    
    try {
        const today = new Date();
        const dayOfMonth = today.getDate();

        // 1. LEMBRETE: 5 Dias Antes do Vencimento
        const nextDueDay = dayOfMonth + 5; 
        // Nota: Lógica simplificada para dias > 28 requer manipulação de data completa (Moment.js ou date-fns recomendado)
        // Aqui assumimos verificação simples de dia do mês para o MVP
        
        const subsWarning = await db.query(`
            SELECT s.*, u.name, u.email, p.price, p.name as plan_name 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active' AND s.payment_due_day = $1 AND p.price > 0
        `, [nextDueDay]);

        for (const sub of subsWarning.rows) {
            const pixCode = generatePixCopyPaste(parseFloat(sub.price), sub);
            
            // Notificação na Plataforma
            await createNotification(
                sub.user_id, 
                'Fatura Próxima', 
                `Sua fatura vence em 5 dias. Código PIX disponível.`, 
                '/client/financial', 
                'info'
            );

            // Email
            await sendEmail(
                sub.email, 
                'Lembrete de Pagamento - Momentum Fit',
                `Olá ${sub.name}, sua fatura do plano ${sub.plan_name} vence dia ${sub.payment_due_day}. \n\nValor: R$ ${sub.price}\n\nPix Copia e Cola:\n${pixCode}`
            );
            console.log(`Aviso 5 dias enviado para: ${sub.email}`);
        }

        // 2. LEMBRETE: Dia do Vencimento
        const subsDueToday = await db.query(`
            SELECT s.*, u.name, u.email, p.price 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active' AND s.payment_due_day = $1 AND p.price > 0
        `, [dayOfMonth]);

        for (const sub of subsDueToday.rows) {
            const pixCode = generatePixCopyPaste(parseFloat(sub.price), sub);
            
            await createNotification(
                sub.user_id, 
                'Fatura Vence Hoje', 
                `Realize o pagamento hoje para evitar bloqueio.`, 
                '/client/financial', 
                'alert'
            );
            
             await sendEmail(
                sub.email, 
                'Fatura Vence HOJE - Momentum Fit',
                `Olá ${sub.name}, sua fatura vence hoje! \n\nPix Copia e Cola:\n${pixCode}`
            );
             console.log(`Aviso vencimento enviado para: ${sub.email}`);
        }

        // 3. VERIFICAÇÃO DE ATRASO (2 dias depois)
        // Lógica: Se hoje é dia X, verificamos quem venceu dia X-2 e NÃO tem pagamento 'paid' registrado neste mês
        let checkLateDay = dayOfMonth - 2;
        if (checkLateDay < 1) checkLateDay = 28; // Fallback simples

        const subsLate = await db.query(`
            SELECT s.*, u.name, u.email, p.price 
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status = 'active' AND s.payment_due_day = $1 AND p.price > 0
        `, [checkLateDay]);

        for (const sub of subsLate.rows) {
            // Verifica se houve pagamento nos últimos 5 dias
            const payCheck = await db.query(`
                SELECT * FROM payments 
                WHERE subscription_id = $1 AND status = 'paid' 
                AND payment_date > NOW() - INTERVAL '5 days'
            `, [sub.id]);

            if (payCheck.rows.length === 0) {
                // Notifica Admin para confirmar
                await createNotification(
                    null, // Null = Admin
                    'Atraso Detectado',
                    `Cliente ${sub.name} venceu dia ${checkLateDay} e não tem pagamento confirmado. Verifique.`,
                    `/admin/users/${sub.user_id}`,
                    'alert'
                );
                console.log(`Alerta de atraso admin para cliente: ${sub.name}`);
            }
        }

    } catch (err) {
        console.error("Erro no Scheduler Diário:", err);
    }
}

module.exports = { runDailyChecks };
