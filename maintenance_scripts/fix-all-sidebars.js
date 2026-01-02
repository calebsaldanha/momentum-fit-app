const fs = require('fs');
const path = require('path');

// Mapeamento: Arquivo -> Qual Sidebar usar e qual item do menu destacar
const pagesConfig = [
    // --- CLIENTE ---
    { 
        file: 'views/pages/client-workouts.ejs', 
        sidebar: 'client-sidebar.ejs', 
        activePage: 'workouts' 
    },
    { 
        file: 'views/pages/client-profile.ejs', 
        sidebar: 'client-sidebar.ejs', 
        activePage: 'profile' 
    },
    { 
        file: 'views/pages/client-details.ejs', 
        sidebar: 'admin-sidebar.ejs', // Geralmente é o admin vendo o cliente
        activePage: 'clients' 
    },

    // --- ADMIN (TREINADOR) ---
    { 
        file: 'views/pages/admin-clients.ejs', 
        sidebar: 'admin-sidebar.ejs', 
        activePage: 'clients' 
    },
    { 
        file: 'views/pages/create-workout.ejs', 
        sidebar: 'admin-sidebar.ejs', 
        activePage: 'dashboard' 
    },
    { 
        file: 'views/pages/edit-workout.ejs', 
        sidebar: 'admin-sidebar.ejs', 
        activePage: 'dashboard' 
    },
    { 
        file: 'views/pages/workout-details.ejs', 
        sidebar: 'admin-sidebar.ejs', 
        activePage: 'dashboard' 
    },
    { 
        file: 'views/pages/trainer-details.ejs', 
        sidebar: 'admin-sidebar.ejs', 
        activePage: 'trainers'
    },

    // --- SUPER ADMIN ---
    { 
        file: 'views/pages/superadmin-manage.ejs', 
        sidebar: 'superadmin-sidebar.ejs', 
        activePage: 'superadmin-manage' 
    },
    { 
        file: 'views/pages/manage-articles.ejs', 
        sidebar: 'superadmin-sidebar.ejs', 
        activePage: 'articles-manage' 
    },
    { 
        file: 'views/pages/create-article.ejs', 
        sidebar: 'superadmin-sidebar.ejs', 
        activePage: 'articles-manage' 
    }
];

// Função para processar o Chat (que é especial pois serve para todos)
function fixChatPage() {
    const chatPath = path.join(__dirname, '../views/pages/chat.ejs');
    if (!fs.existsSync(chatPath)) return;

    let content = fs.readFileSync(chatPath, 'utf8');
    
    // Remove sidebar antiga hardcoded se existir
    const regex = /<aside class="dashboard-sidebar">[\s\S]*?<\/aside>/;
    
    if (regex.test(content)) {
        console.log(`��� Atualizando: views/pages/chat.ejs`);
        
        // Lógica dinâmica para o chat
        const dynamicSidebar = `
    <% if (user.role === 'client') { %>
        <%- include('../partials/client-sidebar.ejs', { currentPage: 'chat' }) %>
    <% } else if (user.role === 'superadmin' && typeof isSuperAdminMode !== 'undefined' && isSuperAdminMode) { %>
        <%- include('../partials/superadmin-sidebar.ejs', { currentPage: 'dashboard' }) %>
    <% } else { %>
        <%- include('../partials/admin-sidebar.ejs', { currentPage: 'dashboard' }) %>
    <% } %>`;

        const newContent = content.replace(regex, dynamicSidebar);
        fs.writeFileSync(chatPath, newContent);
    }
}

// Executar substituições
console.log("Iniciando padronização das sidebars...");

pagesConfig.forEach(config => {
    const filePath = path.join(__dirname, '..', config.file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Regex para encontrar <aside class="dashboard-sidebar">...</aside>
        // O [\s\S]*? pega tudo (incluindo quebras de linha) de forma não-gulosa até o primeiro </aside>
        const sidebarRegex = /<aside class="dashboard-sidebar">[\s\S]*?<\/aside>/;

        if (sidebarRegex.test(content)) {
            console.log(`��� Atualizando: ${config.file}`);
            
            // Cria a string do include com a página ativa correta
            const includeString = `<%- include('../partials/${config.sidebar}', { currentPage: '${config.activePage}' }) %>`;
            
            const newContent = content.replace(sidebarRegex, includeString);
            fs.writeFileSync(filePath, newContent);
        } else {
            // Se não achou sidebar hardcoded, verifica se já tem include e atualiza o activePage se necessário
            // (Opcional, mas bom para garantir consistência)
            console.log(`✓ Já atualizado ou sem sidebar: ${config.file}`);
        }
    } else {
        console.log(`⚠️ Arquivo não encontrado: ${config.file}`);
    }
});

fixChatPage();
console.log("✅ Concluído! Todas as páginas agora usam os partials padronizados.");
