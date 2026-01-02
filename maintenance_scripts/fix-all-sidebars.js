const fs = require('fs');
const path = require('path');

const configs = [
    // Cliente
    { file: 'views/pages/client-dashboard.ejs', sidebar: 'client-sidebar.ejs', active: 'dashboard' },
    { file: 'views/pages/client-workouts.ejs', sidebar: 'client-sidebar.ejs', active: 'workouts' },
    { file: 'views/pages/client-profile.ejs', sidebar: 'client-sidebar.ejs', active: 'profile' },
    { file: 'views/pages/client-details.ejs', sidebar: 'admin-sidebar.ejs', active: 'clients' }, // Admin vendo cliente
    // Admin
    { file: 'views/pages/admin-dashboard.ejs', sidebar: 'admin-sidebar.ejs', active: 'dashboard' },
    { file: 'views/pages/admin-clients.ejs', sidebar: 'admin-sidebar.ejs', active: 'clients' },
    { file: 'views/pages/create-workout.ejs', sidebar: 'admin-sidebar.ejs', active: 'dashboard' },
    { file: 'views/pages/edit-workout.ejs', sidebar: 'admin-sidebar.ejs', active: 'dashboard' },
    { file: 'views/pages/pending-trainer.ejs', sidebar: 'admin-sidebar.ejs', active: 'dashboard' },
    // Superadmin
    { file: 'views/pages/superadmin-dashboard.ejs', sidebar: 'superadmin-sidebar.ejs', active: 'superadmin-dashboard' },
    { file: 'views/pages/superadmin-manage.ejs', sidebar: 'superadmin-sidebar.ejs', active: 'superadmin-manage' },
    { file: 'views/pages/manage-articles.ejs', sidebar: 'superadmin-sidebar.ejs', active: 'articles-manage' }
];

configs.forEach(conf => {
    const p = path.join(__dirname, '..', conf.file);
    if(fs.existsSync(p)) {
        let c = fs.readFileSync(p, 'utf8');
        // Remove sidebar hardcoded OU sidebar antiga via include
        c = c.replace(/<aside class="dashboard-sidebar">[\s\S]*?<\/aside>/g, ''); 
        c = c.replace(/<%- include\(['"]\.\.\/partials\/.*-sidebar\.ejs['"]\s*(,\s*\{.*\})?\s*\)\s*%>/g, '');
        
        // Insere a nova
        const include = \`<%- include('../partials/\${conf.sidebar}', { currentPage: '\${conf.active}' }) %>\`;
        // Procura onde inserir (geralmente depois do container ou header)
        if(c.includes('<div class="dashboard-container">')) {
            c = c.replace('<div class="dashboard-container">', \`<div class="dashboard-container">\n    \${include}\`);
            console.log(`✅ Fixed: \${conf.file}`);
            fs.writeFileSync(p, c);
        } else {
            console.log(`⚠️ Skipped (no container): \${conf.file}`);
        }
    }
});

// Tratamento Especial: Workout Details (Híbrido)
const wdPath = path.join(__dirname, '../views/pages/workout-details.ejs');
if(fs.existsSync(wdPath)) {
    let c = fs.readFileSync(wdPath, 'utf8');
    c = c.replace(/<aside class="dashboard-sidebar">[\s\S]*?<\/aside>/g, '');
    const hybridSidebar = `
    <% if (user.role === 'client') { %>
        <%- include('../partials/client-sidebar.ejs', { currentPage: 'workouts' }) %>
    <% } else { %>
        <%- include('../partials/admin-sidebar.ejs', { currentPage: 'dashboard' }) %>
    <% } %>`;
    
    if(c.includes('<div class="dashboard-container">') && !c.includes('include')) {
        c = c.replace('<div class="dashboard-container">', `<div class="dashboard-container">\n${hybridSidebar}`);
        fs.writeFileSync(wdPath, c);
        console.log(`✅ Fixed Hybrid: workout-details.ejs`);
    }
}
