const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../database/db');

module.exports = function(passport) {
    passport.use(
        new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
            try {
                // 1. Normalizar input
                const emailLower = email.toLowerCase().trim();
                
                // 2. Buscar usuário
                const result = await db.query('SELECT * FROM users WHERE email = $1', [emailLower]);
                
                if (result.rows.length === 0) {
                    return done(null, false, { message: 'Email não cadastrado.' });
                }

                const user = result.rows[0];

                // 3. BLINDAGEM CONTRA CRASH (Correção do erro Illegal arguments)
                if (!user.password) {
                    console.error(`[CRITICAL] Usuário ${user.id} (${user.email}) não possui hash de senha.`);
                    return done(null, false, { message: 'Erro na conta: Senha não definida. Contate o suporte.' });
                }

                // 4. Verificar senha
                const isMatch = await bcrypt.compare(password, user.password);
                
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Senha incorreta.' });
                }
            } catch (err) {
                console.error('Erro crítico no Passport:', err);
                return done(err);
            }
        })
    );

    // Serializar
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Desserializar
    passport.deserializeUser(async (id, done) => {
        try {
            const query = `
                SELECT u.id, u.name, u.email, u.role, p.weight, p.height 
                FROM users u 
                LEFT JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = $1
            `;
            const result = await db.query(query, [id]);
            
            if (result.rows.length > 0) {
                const row = result.rows[0];
                // Reconstrói objeto user seguro
                const user = {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    role: row.role,
                    profile: {
                        weight: row.weight,
                        height: row.height
                    }
                };
                done(null, user);
            } else {
                // Usuário na sessão não existe mais no banco
                done(null, false);
            }
        } catch (err) {
            done(err, null);
        }
    });
};
