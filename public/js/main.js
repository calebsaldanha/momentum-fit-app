/**
 * Momentum Fit - Main Scripts
 * Handles Layout, Sidebar, and UI Interactions
 */

(function() {
    // --- SIDEBAR LOGIC ---
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('dashboardOverlay');
        const body = document.body;

        if (sidebar && overlay) {
            const isActive = sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Travar scroll no mobile para evitar rolar o fundo
            if (window.innerWidth < 992) {
                body.style.overflow = isActive ? 'hidden' : '';
            }
        } else {
            console.error('Sidebar elements not found in DOM');
        }
    };

    // Fechar ao clicar no overlay
    document.addEventListener('click', function(e) {
        if (e.target.id === 'dashboardOverlay') {
            window.toggleSidebar();
        }
    });

    // --- ALERTS AUTO-CLOSE ---
    document.addEventListener('DOMContentLoaded', () => {
        const alerts = document.querySelectorAll('.alert');
        if (alerts.length > 0) {
            setTimeout(() => {
                alerts.forEach(alert => {
                    alert.style.transition = 'opacity 0.5s ease';
                    alert.style.opacity = '0';
                    setTimeout(() => alert.remove(), 500);
                });
            }, 5000); // 5 segundos
        }
    });

    // --- MOBILE MENU PUBLICO ---
    window.togglePublicMenu = function() {
        const menu = document.getElementById('publicMenu');
        if (menu) {
            const isActive = menu.classList.toggle('active');
            document.body.style.overflow = isActive ? 'hidden' : '';
        }
    };
})();
