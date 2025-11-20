// app.js (Exemplo de estrutura)

// 1. Importar as dependências
const express = require('express');
// ... outras dependências

// 2. Criar a instância do app
const app = express();

// 3. Configurações, Middlewares e Rotas
// ... app.use(express.json());
// ... app.set('view engine', 'ejs');
// ... app.use('/', require('./routes/index'));

// 4. Exportar o app para o Vercel
module.exports = app;

// 5. (Opcional, mas comum) Iniciar o servidor SOMENTE se não for um ambiente Vercel
//    O Vercel assume o controle da inicialização.
const port = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}