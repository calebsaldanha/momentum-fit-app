document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileDrawer');

    if (mobileBtn && mobileDrawer) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mobileDrawer.classList.contains('active');
            
            if (isOpen) {
                mobileDrawer.classList.remove('active');
                mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            } else {
                mobileDrawer.classList.add('active');
                mobileBtn.innerHTML = '<i class="fas fa-times"></i>';
            }
        });

        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!mobileDrawer.contains(e.target) && !mobileBtn.contains(e.target) && mobileDrawer.classList.contains('active')) {
                mobileDrawer.classList.remove('active');
                mobileBtn.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
});
