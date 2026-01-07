document.addEventListener('DOMContentLoaded', () => {
    
    // --- MENU PRINCIPAL (Site) ---
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navWrapper = document.getElementById('navWrapper');

    if (mobileBtn && navWrapper) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle classes
            mobileBtn.classList.toggle('active');
            navWrapper.classList.toggle('active');
        });

        // Fechar ao clicar fora ou em um link
        document.addEventListener('click', (e) => {
            const isClickInside = navWrapper.contains(e.target) || mobileBtn.contains(e.target);
            
            if (!isClickInside && navWrapper.classList.contains('active')) {
                navWrapper.classList.remove('active');
                mobileBtn.classList.remove('active');
            }
        });
    }

    // --- SIDEBAR DO DASHBOARD (Apenas Páginas de Painel) ---
    const dashBtn = document.getElementById('dashboardSidebarBtn');
    const dashSidebar = document.querySelector('.dashboard-sidebar');
    
    if (dashBtn && dashSidebar) {
        // Criar overlay se não existir
        let overlay = document.querySelector('.dashboard-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'dashboard-overlay';
            document.body.appendChild(overlay);
        }

        function closeSidebar() {
            dashSidebar.classList.remove('active');
            overlay.classList.remove('active');
            // Reset ícone para menu
            const icon = dashBtn.querySelector('i');
            if(icon) {
                icon.classList.remove('fa-arrow-left');
                icon.classList.add('fa-bars-staggered');
            }
        }

        function openSidebar() {
            dashSidebar.classList.add('active');
            overlay.classList.add('active');
            // Muda ícone para voltar
            const icon = dashBtn.querySelector('i');
            if(icon) {
                icon.classList.remove('fa-bars-staggered');
                icon.classList.add('fa-arrow-left');
            }
        }

        dashBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dashSidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        overlay.addEventListener('click', closeSidebar);
    }
});
