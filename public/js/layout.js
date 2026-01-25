document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    function toggleSidebar() {
        if (!sidebar) return;
        
        // Tailwind usa classes para visibilidade.
        // No mobile, sidebar começa com -translate-x-full (escondido)
        const isHidden = sidebar.classList.contains('-translate-x-full');
        
        if (isHidden) {
            // Abrir
            sidebar.classList.remove('-translate-x-full');
            if (sidebarOverlay) {
                sidebarOverlay.classList.remove('hidden');
                setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); // Fade in
            }
        } else {
            // Fechar
            sidebar.classList.add('-translate-x-full');
            if (sidebarOverlay) {
                sidebarOverlay.classList.add('opacity-0');
                setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); // Wait for fade out
            }
        }
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Reset ao redimensionar a tela
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024 && sidebar) {
            sidebar.classList.remove('-translate-x-full'); // Sempre visível no desktop
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        }
    });
});
