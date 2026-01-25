document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    const closeBtn = document.querySelector('.sidebar-close-btn');

    if (!sidebar || !toggleBtn) return;

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Trava scroll do fundo
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Libera scroll
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSidebar();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Fechar ao clicar em links (UX Mobile)
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) closeSidebar();
        });
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
});
