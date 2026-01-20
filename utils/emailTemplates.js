const templates = {
    welcome_pending: (name) => ({
        subject: 'Bem-vindo ao Momentum Fit - Cadastro em Análise',
        html: `<h2>Olá, ${name}!</h2><p>Seu cadastro foi recebido. Nossa equipe administrativa irá analisar seus dados. Você receberá um e-mail assim que sua conta for aprovada.</p>`
    }),
    welcome_active: (name) => ({
        subject: 'Bem-vindo ao Momentum Fit!',
        html: `<h2>Olá, ${name}!</h2><p>Seu cadastro está confirmado. <a href="https://momentumfit.com/auth/login">Clique aqui para acessar a plataforma</a> e começar sua jornada.</p>`
    }),
    account_approved: (name, role) => ({
        subject: 'Sua conta foi APROVADA! ✅',
        html: `<h2>Parabéns, ${name}!</h2><p>Sua conta de ${role === 'trainer' ? 'Personal Trainer' : 'Aluno'} foi aprovada. Acesse agora para completar seu perfil.</p>`
    }),
    account_rejected: (name) => ({
        subject: 'Atualização sobre seu cadastro',
        html: `<h2>Olá, ${name}.</h2><p>Infelizmente não pudemos aprovar seu cadastro no momento. Entre em contato com o suporte para mais detalhes.</p>`
    }),
    new_user_admin: (name, role) => ({
        subject: `Novo Registro: ${role.toUpperCase()}`,
        html: `<h2>Novo usuário aguardando</h2><p>Nome: ${name}<br>Tipo: ${role}</p><a href="https://momentumfit.com/admin/users">Gerenciar Usuários</a>`
    }),
    payment_pending_admin: (userName, planName) => ({
        subject: '��� Novo Comprovante de Pagamento',
        html: `<h2>Pagamento Pendente</h2><p>Usuário: ${userName}<br>Plano: ${planName}</p><p>Verifique o comprovante no painel financeiro.</p>`
    }),
    payment_reminder: (name) => ({
        subject: 'Lembrete: Pagamento Pendente',
        html: `<h2>Olá, ${name}</h2><p>Notamos que seu pagamento ainda não foi regularizado. Por favor, envie o comprovante para evitar a suspensão do acesso.</p>`
    }),
    new_assignment: (clientName, trainerName, isForTrainer) => {
        if (isForTrainer) {
            return { subject: 'Novo Aluno Atribuído ���️', html: `<h2>Você tem um novo aluno!</h2><p>${clientName} foi adicionado à sua lista. Prepare o treino dele!</p>` };
        } else {
            return { subject: 'Você tem um novo Personal Trainer! ���', html: `<h2>Olá, ${clientName}!</h2><p>Seu novo treinador é <strong>${trainerName}</strong>. Ele entrará em contato em breve.</p>` };
        }
    },
    workout_update: (title, type) => ({
        subject: `Treino ${type}: ${title}`,
        html: `<h2>Atualização de Treino</h2><p>O treino "<strong>${title}</strong>" foi ${type.toLowerCase()}. Acesse o app para ver os detalhes.</p>`
    }),
    article_status: (title, status) => ({
        subject: `Artigo ${status}: ${title}`,
        html: `<h2>Seu artigo foi ${status}</h2><p>Título: ${title}</p>`
    }),
    new_article_client: (title) => ({
        subject: 'Novo Artigo no Blog! ���',
        html: `<h2>Confira a novidade</h2><p>Um novo artigo "<strong>${title}</strong>" acaba de ser publicado. Venha ler!</p>`
    }),
    profile_reminder: (name) => ({
        subject: 'Complete seu Perfil ���',
        html: `<h2>Faltam poucas informações, ${name}!</h2><p>Para garantirmos o melhor resultado, por favor, termine de preencher sua ficha de anamnese/perfil.</p>`
    }),
    ai_error: (errorMsg) => ({
        subject: '⚠️ Alerta: Erro na IA',
        html: `<h2>Falha no Momentum AI</h2><p>Erro: ${errorMsg}</p>`
    })
};

module.exports = templates;
