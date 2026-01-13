document.addEventListener('DOMContentLoaded', () => {
    console.log('Momentum Fit: Scripts carregados.');

    // --- MENU MOBILE ---
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');

    if (mobileBtn && mobileDrawer) {
        // Garante que o CSS inicial esteja correto
        mobileDrawer.classList.remove('active');

        // Função de Alternância
        mobileBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Evita comportamentos padrão
            e.stopPropagation(); // Evita que o clique feche o menu imediatamente
            
            const icon = mobileBtn.querySelector('i');
            const isActive = mobileDrawer.classList.contains('active');

            if (isActive) {
                // Fechar
                mobileDrawer.classList.remove('active');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            } else {
                // Abrir
                mobileDrawer.classList.add('active');
                if (icon) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                }
            }
        });

        // Fechar ao clicar fora (no corpo da página)
        document.addEventListener('click', (e) => {
            const isActive = mobileDrawer.classList.contains('active');
            const clickedInsideDrawer = mobileDrawer.contains(e.target);
            const clickedOnBtn = mobileBtn.contains(e.target);

            if (isActive && !clickedInsideDrawer && !clickedOnBtn) {
                mobileDrawer.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
    } else {
        console.warn('Momentum Fit: Elementos do menu mobile não encontrados nesta página.');
    }

    // --- DASHBOARD SIDEBAR (Se existir) ---
    const sidebarToggle = document.getElementById('dashboardSidebarBtn');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth < 992 && 
                sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
});
