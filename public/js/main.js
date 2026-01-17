document.addEventListener('DOMContentLoaded', () => {
    // 1. Menu Mobile Global (Header)
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        const closeGlobalMenu = () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeGlobalMenu);
        mobileMenu.addEventListener('click', (e) => {
            if (e.target === mobileMenu) closeGlobalMenu();
        });
    }

    // 2. Sidebar Mobile (Dashboard)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (sidebarToggle && sidebar) {
        // Abrir Sidebar
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.add('active');
            if(sidebarOverlay) sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        // Fechar Sidebar
        const closeSidebar = () => {
            sidebar.classList.remove('active');
            if(sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // 3. Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
