document.addEventListener('DOMContentLoaded', () => {
    
    // Elementos do Menu Mobile
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');
    const icon = mobileBtn ? mobileBtn.querySelector('i') : null;

    if (mobileBtn && mobileDrawer) {
        
        // Função Toggle
        function toggleMenu(e) {
            if(e) e.stopPropagation();
            
            const isOpen = mobileDrawer.classList.contains('active');
            
            if (isOpen) {
                // Fechar
                mobileDrawer.classList.remove('active');
                if(icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            } else {
                // Abrir
                mobileDrawer.classList.add('active');
                if(icon) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                }
            }
        }

        // Event Listeners
        mobileBtn.addEventListener('click', toggleMenu);

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            const isClickInside = mobileDrawer.contains(e.target) || mobileBtn.contains(e.target);
            if (!isClickInside && mobileDrawer.classList.contains('active')) {
                toggleMenu(); // fecha
            }
        });

        // Fechar ao clicar em link (UX)
        const links = mobileDrawer.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if(mobileDrawer.classList.contains('active')) toggleMenu();
            });
        });
    }

    // Sidebar do Dashboard (se existir)
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});
