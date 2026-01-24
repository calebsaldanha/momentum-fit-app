/**
 * Middleware Flash Messages (Versão Segura para Node 22+)
 * Substitui 'connect-flash' para evitar erro [DEP0044] (util.isArray).
 */
module.exports = function flash(options) {
  options = options || {};
  var safe = (options.unsafe === undefined) ? true : !options.unsafe;

  return function(req, res, next) {
    if (req.flash && safe) { return next(); }
    
    req.flash = function _flash(type, msg) {
      if (this.session === undefined) throw Error('req.flash() requires sessions');
      
      var msgs = this.session.flash = this.session.flash || {};
      
      if (type && msg) {
        // WRITE
        if (Array.isArray(msg)) { // Fix: Usa Array.isArray nativo
          msg.forEach(function(val){
            (msgs[type] = msgs[type] || []).push(val);
          });
          return msgs[type].length;
        }
        (msgs[type] = msgs[type] || []).push(msg);
        return msgs[type].length;
      } else if (type) {
        // READ
        var arr = msgs[type];
        delete msgs[type];
        return arr || [];
      } else {
        // READ ALL
        this.session.flash = {};
        return msgs;
      }
    }
    next();
  }
}
