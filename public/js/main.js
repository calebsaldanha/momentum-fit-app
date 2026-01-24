/* =========================================
   DASHBOARD LOGIC ONLY
   ========================================= */

// Função para alternar a Sidebar (Menu Lateral do Painel)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('dashboardOverlay');
    
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// Fechar Sidebar ao clicar fora (Overlay)
document.addEventListener('click', function(e) {
    const overlay = document.getElementById('dashboardOverlay');
    const sidebar = document.getElementById('sidebar');
    
    if (e.target === overlay) {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
});

// Fechar alertas automaticamente após 5 segundos
document.addEventListener('DOMContentLoaded', () => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
