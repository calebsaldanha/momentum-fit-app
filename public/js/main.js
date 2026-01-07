document.addEventListener('DOMContentLoaded', () => {
    // --- Lógica do Menu Principal (Header) ---
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navWrapper = document.getElementById('navWrapper');

    if (mobileBtn && navWrapper) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navWrapper.classList.toggle('active');
            
            const icon = mobileBtn.querySelector('i');
            if (icon) { // Caso use ícone font-awesome dentro da div hamburger (opcional)
                if (navWrapper.classList.contains('active')) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            } else {
                // Animação padrão do Hamburger CSS (transformando as barras)
                mobileBtn.classList.toggle('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (navWrapper.classList.contains('active') && !navWrapper.contains(e.target) && !mobileBtn.contains(e.target)) {
                navWrapper.classList.remove('active');
                if (mobileBtn.classList.contains('active')) mobileBtn.classList.remove('active');
            }
        });
    }

    // --- Lógica da Sidebar do Dashboard (Mobile) ---
    const dashBtn = document.getElementById('dashboardSidebarBtn');
    const dashSidebar = document.querySelector('.dashboard-sidebar');

    if (dashBtn && dashSidebar) {
        // Criar Overlay dinamicamente se não existir
        let overlay = document.querySelector('.dashboard-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'dashboard-overlay';
            document.body.appendChild(overlay);
        }

        function toggleDashboardSidebar() {
            dashSidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Alternar ícone
            const icon = dashBtn.querySelector('i');
            if (icon) {
                if (dashSidebar.classList.contains('active')) {
                    icon.classList.remove('fa-bars-staggered');
                    icon.classList.add('fa-arrow-left');
                } else {
                    icon.classList.remove('fa-arrow-left');
                    icon.classList.add('fa-bars-staggered');
                }
            }
        }

        dashBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDashboardSidebar();
        });

        overlay.addEventListener('click', () => {
            if (dashSidebar.classList.contains('active')) {
                toggleDashboardSidebar();
            }
        });
    }
});
