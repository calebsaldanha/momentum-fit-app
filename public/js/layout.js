document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const closeBtn = document.getElementById('close-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() {
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        
        if (overlay) {
            if (sidebar.classList.contains('open')) {
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);
    
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // Auto-close on resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && sidebar) {
            sidebar.classList.remove('open');
            if (overlay) overlay.style.display = 'none';
        }
    });
});
