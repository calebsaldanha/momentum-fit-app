document.addEventListener('DOMContentLoaded', () => {
    // --- MENU MOBILE ---
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNavWrapper');

    if (mobileBtn && mobileNav) {
        // Função para alternar o menu
        function toggleMenu(e) {
            if(e) e.stopPropagation(); // Impede clique fantasma
            
            const isActive = mobileNav.classList.contains('active');
            
            if (isActive) {
                mobileNav.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            } else {
                mobileNav.classList.add('active');
                const icon = mobileBtn.querySelector('i');
                if(icon) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                }
            }
        }

        // Evento de clique
        mobileBtn.addEventListener('click', toggleMenu);

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            const isClickInside = mobileNav.contains(e.target) || mobileBtn.contains(e.target);
            if (!isClickInside && mobileNav.classList.contains('active')) {
                toggleMenu();
            }
        });
        
        // Fechar ao clicar em um link do menu
        const mobileLinks = mobileNav.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // --- SIDEBAR DO PAINEL (Se existir) ---
    const sidebarBtn = document.getElementById('dashboardSidebarBtn');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    if (sidebarBtn && sidebar) {
        sidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // Fechar sidebar ao clicar fora (opcional)
        document.addEventListener('click', (e) => {
             if (window.innerWidth < 992 && 
                 sidebar.classList.contains('active') && 
                 !sidebar.contains(e.target) && 
                 !sidebarBtn.contains(e.target)) {
                sidebar.classList.remove('active');
             }
        });
    }
});
