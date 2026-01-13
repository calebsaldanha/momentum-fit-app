document.addEventListener('DOMContentLoaded', () => {
    // Menu Mobile Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNavWrapper');

    if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileNav.classList.toggle('active');
            
            // Alternar ícone
            const icon = mobileBtn.querySelector('i');
            if (mobileNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!mobileNav.contains(e.target) && !mobileBtn.contains(e.target) && mobileNav.classList.contains('active')) {
                mobileNav.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Sidebar Toggle (Dashboard)
    const sidebarBtn = document.getElementById('dashboardSidebarBtn');
    const sidebar = document.querySelector('.dashboard-sidebar');
    
    if (sidebarBtn && sidebar) {
        sidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
});
