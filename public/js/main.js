document.addEventListener('DOMContentLoaded', () => {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navWrapper = document.getElementById('navWrapper');

    if (mobileBtn && navWrapper) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita cliques fantasmas
            navWrapper.classList.toggle('active');
            
            // Alternar ícone (Bars <-> Times)
            const icon = mobileBtn.querySelector('i');
            if (navWrapper.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (navWrapper.classList.contains('active') && !navWrapper.contains(e.target) && !mobileBtn.contains(e.target)) {
                navWrapper.classList.remove('active');
                const icon = mobileBtn.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
});
