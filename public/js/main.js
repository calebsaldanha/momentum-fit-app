document.addEventListener('DOMContentLoaded', () => {
    // Menu Mobile
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }));
        
        document.addEventListener('click', (e) => {
             if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // Container de Notifica√ß√µes
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
});

function showNotification(message, type = 'info') {
    const container = document.querySelector('.notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    container.prepend(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 4000);
}

// --- L√≥gica de Notifica√ß√µes ---
function toggleNotifications(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notifDropdown');
    dropdown.classList.toggle('active');
}

// Fechar ao clicar fora
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifDropdown');
    const btn = document.getElementById('notifBtn');
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

async function markAllRead() {
    try {
        await fetch('/notifications/mark-all-read', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        // Remover badge visualmente
        const badge = document.querySelector('.notif-badge');
        if(badge) badge.remove();
        
        // Mudar items para lidos visualmente
        document.querySelectorAll('.notif-item.unread').forEach(el => {
            el.classList.remove('unread');
            el.classList.add('read');
        });
    } catch(e) { console.error(e); }
}

async function clickNotification(id, link) {
    try {
        // Marcar como lida
        await fetch(`/notifications/mark-read/${id}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        // Redirecionar
        if (link && link !== 'null') window.location.href = link;
    } catch(e) { 
        console.error(e);
        if (link && link !== 'null') window.location.href = link;
    }
}

/* --- Corre√ß√£o Notifica√ß√µes (Global Scope) --- */
window.toggleNotifications = function(e) {
    console.log('Ì¥î Clique no sino detetado!');
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) {
        console.error('‚ùå Elemento dropdown n√£o encontrado!');
        return;
    }
    
    // Toggle da classe active
    const isActive = dropdown.classList.toggle('active');
    console.log('Estado do dropdown:', isActive ? 'Aberto' : 'Fechado');
};

window.markAllRead = async function() {
    console.log('Ì∑π Marcando todas como lidas...');
    try {
        await fetch('/notifications/mark-all-read', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const badge = document.querySelector('.notif-badge');
        if(badge) badge.remove();
        document.querySelectorAll('.notif-item.unread').forEach(el => {
            el.classList.remove('unread');
            el.classList.add('read');
        });
    } catch(e) { console.error('Erro ao marcar lidas:', e); }
};

window.clickNotification = async function(id, link) {
    console.log('Ì¥ó Clicou na notifica√ß√£o:', id);
    try {
        await fetch(`/notifications/mark-read/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (link && link !== 'null' && link !== '') window.location.href = link;
    } catch(e) { 
        console.error(e);
        if (link && link !== 'null' && link !== '') window.location.href = link;
    }
};

// Fechar ao clicar fora (Evento Global)
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notifDropdown');
    const btn = document.getElementById('notifBtn');
    
    // Se o dropdown est√° aberto E o clique N√ÉO foi no dropdown NEM no bot√£o
    if (dropdown && dropdown.classList.contains('active')) {
        if (!dropdown.contains(e.target) && (!btn || !btn.contains(e.target))) {
            console.log('Ì∫™ Fechando dropdown (clique fora)');
            dropdown.classList.remove('active');
        }
    }
});
