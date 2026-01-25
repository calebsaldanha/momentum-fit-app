const pool = require('./db');

async function check() {
    console.log("Ì≥° Testando conex√£o com o Banco...");
    try {
        const res = await pool.query('SELECT NOW() as now, current_database() as db');
        console.log("‚úÖ CONEX√ÉO BEM SUCEDIDA!");
        console.log("Ìµí Hor√°rio do Banco:", res.rows[0].now);
        console.log("Ì∑ÑÔ∏è  Database:", res.rows[0].db);
        process.exit(0);
    } catch (err) {
        console.error("‚ùå FALHA CR√çTICA DE CONEX√ÉO:");
        console.error(err);
        process.exit(1);
    }
}

check();
