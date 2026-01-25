document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    function toggleSidebar() {
        if (!sidebar) return;
        
        // Lógica para Mobile: Usa classes de translação
        const isClosed = sidebar.classList.contains('-translate-x-full');
        
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        }
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
    }

    // Fecha sidebar ao redimensionar para Desktop (previne bugs visuais)
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024 && sidebar) {
            sidebar.classList.remove('-translate-x-full'); // Sempre visível no desktop
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        } else if (sidebar) {
            sidebar.classList.add('-translate-x-full'); // Escondido por padrão no mobile
        }
    });
});
