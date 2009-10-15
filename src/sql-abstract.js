
(function(Global) {
    var p = function() {
        if (typeof console != 'undefined')
            console.log(Array.prototype.slice.call(arguments, 0));
    }

    var extend = function(to, from) {
        if (!from) return to;
        for (var key in from) {
            to[key] = from[key];
        }
        return to;
    }

    var SQLAbstract = Global.SQLAbstract = function(options) {
        this.options = extend({
        }, options);
        return this;
    }

    extend(SQLAbstract, {
        isString: function(obj) {
            return typeof obj === 'string' || obj instanceof String;
        },
        NOT_NULL: "0x01NOTNULL",
        NULL: null
    });

    SQLAbstract.prototype = {
        select: function(table, fields, where, options) {
            if (!fields) fields = '*';
            var stmt, bind = [];
            stmt = 'SELECT ' + (fields || '*') + ' FROM ' + table;
            if (where) {
                var wheres = this.where(where);
                stmt += ' ' + wheres[0];
                bind = wheres[1];
            }
            if (options) {
                var opt = this.optionsToSQL(options);
                stmt += opt[0];
                bind = bind.concat(opt[1]);
            }
            return [stmt, bind];
        },
        insert: function(table, data) {
            var keys = [], bind = [], values = [];
            for (var key in data) {
                if (typeof data[key] != 'undefined') {
                    keys.push(key);
                    bind.push(data[key]);
                    values.push('?');
                }
            }
            var stmt = 'INSERT INTO ' + table + ' (' + keys.join(', ') + ') VALUES (' + values.join(', ') + ')';
            return [stmt, bind];
        },
        update: function(table, data, where) {
            var wheres, keys = [], bind = [];
            if (where) wheres = this.where(where);
            for (var key in data) {
                if (typeof data[key] != 'undefined') {
                    keys.push(key + ' = ?');
                    bind.push(data[key]);
                }
            }
            var stmt = 'UPDATE ' + table + ' SET ' + keys.join(', ');
            if (wheres) {
                stmt += ' ' + wheres[0];
                bind = bind.concat(wheres[1]);
            }
            /* SQLite not support update limit/order ...
            if (options) {
                var opt = this.optionsToSQL(options);
                stmt += opt[0];
                bind = bind.concat(opt[1]);
            }
            */
            return [stmt, bind];
        },
        deleteSql: function(table, where) {
            var wheres, bind = [];
            if (where) wheres = this.where(where);
            var stmt = 'DELETE FROM ' + table;
            if (wheres) {
                stmt += ' ' + wheres[0];
                bind = bind.concat(wheres[1]);
            }
            return [stmt, bind];
        },
        optionsToSQL: function(options) {
            var stmt = '', bind = [];
            if (options) {
                if (options.order) {
                    stmt += ' ORDER BY ' + options.order;
                }
                if (options.group) {
                    stmt += ' GROUP BY ' + options.group;
                }
                if (typeof options.limit != 'undefined') {
                    stmt += ' LIMIT ?';
                    bind.push(parseInt(options.limit));
                }
                if (typeof options.offset != 'undefined') {
                    stmt += ' OFFSET ?';
                    bind.push(parseInt(options.offset));
                }
            }
            return [stmt, bind];
        },
        create: function(table, fields, force) {
            var stmt = 'CREATE TABLE ' + (!force ? 'IF NOT EXISTS ' : '' ) + table + ' ';
            var bind = [];
            var values = [];
            for (var key in fields) {
                bind.push(key + ' ' + fields[key]);
            }
            stmt += ' (' + bind.join(', ') + ')';
            // stmt += ' IF NOT EXISTS ' + table;
            return [stmt, []];
        },
        drop: function(table, force) {
            return ['DROP TABLE ' + (!force ? 'IF EXISTS ' : '' ) + table, []];
        },
        where: function(obj) {
            if (SQLAbstract.isString(obj)) {
                return [obj, null];
            } else if (obj instanceof Array) {
                if (obj[1] instanceof Array) {
                    return ['WHERE ' + obj[0], obj[1]];
                } else if (SQLAbstract.isString(obj[1])) {
                    return ['WHERE ' + obj[0], obj.slice(1)];
                } else {
                    var stmt = obj[0];
                    var hash = obj[1];
                    var re = /:(\w(:?[\w_]+)?)/g;
                    var bind = [];

                    stmt = stmt.replace(re, function(m) {
                        // var key = RegExp.$1;
                        var key = m.substring(1);
                        if (hash[key]) {
                            bind.push(hash[key]);
                        } else {
                            throw new Error('name not found: ' + key);
                        }
                        return '?';
                    });
                    return ['WHERE ' + stmt, bind];
                }
            } else {
                return this.whereHash(obj);
            }
        },
        whereHash: function(hash) {
            var stmt = [], bind = [];
            for (var key in hash) {
                var val = hash[key];
                if (val instanceof Array) {
                    // bind = bind.concat(val);
                    // var len = val.length;
                    var tmp = [];
                    var v;
                    while ((v = val.shift())) {
                        var t = this.holder(key, v);
                        bind = bind.concat(t[1]);
                        tmp.push(t[0]);
                    }
                    stmt.push('(' + tmp.join(' OR ') + ')');
                } else {
                    var r = this.holder(key, val);
                    if (typeof r[1] != 'undefined')
                        bind = bind.concat(r[1]);
                    stmt.push(r[0]);
                }
            }
            return ['WHERE ' + stmt.join(' AND '), bind];
        },
        holder: function(key, hash) {
            var stmt, bind;
            if (typeof hash == 'undefined') {
                stmt = key + ' = ?';
            } else if (hash == null) {
                stmt = key + ' IS NULL';
            } else if (hash == SQLAbstract.NOT_NULL) {
                stmt = key + ' IS NOT NULL';
            } else if (SQLAbstract.isString(hash) || !isNaN(hash)) {
                stmt = key + ' = ?';
                bind = [hash];
            } else if (hash instanceof Array) {
                throw new Error('holder error' + hash);
            } else {
                var st = [], bind = [];
                for (var cmp in hash) {
                    st.push(cmp);
                    bind.push(hash[cmp]);
                }
                if (st.length > 1) {
                    for (var i = 0, len = st.length;  i < len; i++) {
                        st[i] = '(' + key + ' ' + st[i] + ' ?)';
                    }
                    stmt = st.join(' OR ');
                } else {
                    stmt = '' + key + ' ' + st[0] + ' ?';
                }
            }
            return [stmt, bind];
        }
    }
})(this);

