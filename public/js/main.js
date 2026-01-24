/* Controle do Menu Mobile (Dashboard) */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('dashboardOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

/* Fechar ao clicar fora */
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('dashboardOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (e.target === overlay) {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
});

/* Controle do Menu Público */
function togglePublicMenu() {
    const menu = document.getElementById('publicMenu');
    if (menu) menu.classList.toggle('active');
}
