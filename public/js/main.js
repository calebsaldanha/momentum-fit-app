document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Menu Mobile da Home (Público) ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        if (closeMenuBtn) {
            closeMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        // Fechar ao clicar fora (opcional, se clicar nos links)
        const links = mobileMenu.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // --- 2. Sidebar do Dashboard (Logado) ---
    const sidebarOpenBtn = document.getElementById('sidebarOpenBtn'); 
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function openSidebar() {
        if(sidebar) sidebar.classList.add('active');
        if(sidebarOverlay) sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if(sidebar) sidebar.classList.remove('active');
        if(sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (sidebarOpenBtn) {
        sidebarOpenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSidebar();
        });
    }

    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Auto-dismiss de alertas
    const alerts = document.querySelectorAll('.alert');
    if (alerts) {
        alerts.forEach(alert => {
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 500);
            }, 5000);
        });
    }
});
