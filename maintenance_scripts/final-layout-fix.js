const fs = require('fs');
const path = require('path');

// Mapeamento Inteligente: Define qual item do menu deve ficar aceso em cada arquivo
const pageMap = {
    'admin-dashboard.ejs': 'dashboard',
    'admin-clients.ejs': 'clients',
    'client-details.ejs': 'clients', // Admin vendo cliente
    'create-workout.ejs': 'create-workout',
    'edit-workout.ejs': 'dashboard',
    'pending-trainer.ejs': 'dashboard',
    'trainer-details.ejs': 'trainers',
    
    'client-dashboard.ejs': 'dashboard',
    'client-workouts.ejs': 'workouts',
    'client-profile.ejs': 'profile',
    'initial-form.ejs': 'none', // Sem sidebar propositalmente
    
    'superadmin-dashboard.ejs': 'superadmin-dashboard',
    'superadmin-manage.ejs': 'superadmin-manage',
    'manage-articles.ejs': 'articles-manage',
    'create-article.ejs': 'articles-manage',
    'article-details.ejs': 'articles', // Leitura do blog
    'articles.ejs': 'articles',
    
    'chat.ejs': 'chat',
    'workout-details.ejs': 'workouts', // Híbrido, mas destaca workouts/dashboard
    'notifications.ejs': 'notifications'
};

const viewsDir = path.join(__dirname, '../views/pages');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) results = results.concat(getFiles(fullPath));
        else if (file.endsWith('.ejs')) results.push(fullPath);
    });
    return results;
}

const files = getFiles(viewsDir);

console.log("��� Iniciando varredura profunda para padronização total...");

files.forEach(filePath => {
    const fileName = path.basename(filePath);
    
    // Pula arquivos que não devem ter sidebar (Login, Registro, Home, Erro, etc.)
    if (['login.ejs', 'register.ejs', 'index.ejs', 'error.ejs', 'forgot-password.ejs', 'reset-password.ejs', 'about.ejs', 'initial-form.ejs'].includes(fileName)) {
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;

    // Define a página ativa baseada no nome do arquivo (ou padrão 'dashboard')
    const activePage = pageMap[fileName] || 'dashboard';

    // 1. REMOVER HTML DURO (Hardcoded)
    // Procura por blocos <aside class="dashboard-sidebar">...</aside> e deleta
    const hardcodedRegex = /<aside class="dashboard-sidebar">[\s\S]*?<\/aside>/g;
    if (hardcodedRegex.test(content)) {
        console.log(`��� Removendo menu hardcoded de: ${fileName}`);
        content = content.replace(hardcodedRegex, '');
        // Se não tiver o include ainda, prepara para adicionar
        if (!content.includes('<%- include(\'../partials/sidebar.ejs\'')) {
            // Adiciona o include logo após o container
            if (content.includes('<div class="dashboard-container">')) {
                 content = content.replace('<div class="dashboard-container">', 
                    `<div class="dashboard-container">\n    <%- include('../partials/sidebar.ejs', { currentPage: '${activePage}' }) %>`);
            }
        }
        modified = true;
    }

    // 2. SUBSTITUIR INCLUDES ANTIGOS OU ESPECÍFICOS
    // Substitui includes de admin/client/superadmin pelo genérico 'sidebar.ejs'
    const oldIncludeRegex = /<%- include\(['"](\.\.\/partials\/)?(admin|client|superadmin)-sidebar(\.ejs)?['"]\s*(,\s*\{.*?\})?\s*\)\s*%>/g;
    if (oldIncludeRegex.test(content)) {
        content = content.replace(oldIncludeRegex, `<%- include('../partials/sidebar.ejs', { currentPage: '${activePage}' }) %>`);
        modified = true;
    }

    // 3. LIMPEZA DE LÓGICAS MANUAIS (Para Chat e Notifications que tinham if/else no front)
    const manualLogicRegex = /<% if \(user\.role === ['"]client['"]\) \{ %>\s*<%- include.*?<% \} else \{ %>.*?<% \} %>/gs;
    const manualLogicRegex2 = /<% if \(user\.role === ['"]client['"]\) \{ %>\s*<%- include.*?<% \} else if.*?<% \} %>/gs;
    
    if (manualLogicRegex.test(content) || manualLogicRegex2.test(content)) {
        content = content.replace(manualLogicRegex, `<%- include('../partials/sidebar.ejs', { currentPage: '${activePage}' }) %>`);
        content = content.replace(manualLogicRegex2, `<%- include('../partials/sidebar.ejs', { currentPage: '${activePage}' }) %>`);
        modified = true;
    }

    // 4. VERIFICAÇÃO DE SEGURANÇA
    // Se o arquivo tem "dashboard-container" mas NÃO tem sidebar nenhuma, adiciona.
    if (content.includes('<div class="dashboard-container">') && !content.includes('sidebar.ejs')) {
        console.log(`➕ Adicionando sidebar faltante em: ${fileName}`);
        content = content.replace('<div class="dashboard-container">', 
            `<div class="dashboard-container">\n    <%- include('../partials/sidebar.ejs', { currentPage: '${activePage}' }) %>`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Atualizado: ${fileName}`);
    }
});

console.log("��� Tudo limpo! Agora TODAS as páginas usam o mesmo arquivo mestre de menu.");
