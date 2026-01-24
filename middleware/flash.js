module.exports = function flash(options) {
  options = options || {};
  var safe = (options.unsafe === undefined) ? true : !options.unsafe;

  return function(req, res, next) {
    if (req.flash && safe) { return next(); }
    
    req.flash = function _flash(type, msg) {
      if (this.session === undefined) throw Error('req.flash() requires sessions');
      
      // LAZY LOAD: Só inicializa o objeto se formos escrever
      
      if (type && msg) {
        // WRITE
        var msgs = this.session.flash = this.session.flash || {};
        if (Array.isArray(msg)) {
          msg.forEach(function(val){
            (msgs[type] = msgs[type] || []).push(val);
          });
          return msgs[type].length;
        }
        (msgs[type] = msgs[type] || []).push(msg);
        return msgs[type].length;
      } else if (type) {
        // READ: Só deleta se existir (evita "sujar" a sessão desnecessariamente)
        if (this.session.flash && this.session.flash[type]) {
            var arr = this.session.flash[type];
            delete this.session.flash[type];
            // Se flash ficou vazio, podemos limpar o objeto (opcional, mas bom para limpeza)
            if (Object.keys(this.session.flash).length === 0) {
                delete this.session.flash;
            }
            return arr;
        }
        return [];
      } else {
        // READ ALL
        if (this.session.flash) {
            var msgs = this.session.flash;
            delete this.session.flash;
            return msgs;
        }
        return {};
      }
    }
    next();
  }
}
