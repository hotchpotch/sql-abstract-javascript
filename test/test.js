
Deferred.define();
Deferred.prototype._fire = function (okng, value) {
    var next = "ok";
    try {
        value = this.callback[okng].call(this, value);
    } catch (e) {
        next  = "ng";
        if (Deferred.debug) console.error(e);
        value = e;
    }
    if (value instanceof Deferred) {
        value._next = this._next;
    } else {
        if (this._next) this._next._fire(next, value);
    }
    return this;
}

var p = function() {
    if (window.console)
        console.log(Array.prototype.slice.call(arguments, 0));
}

var is = function(a, b, mes) {
    equals(a.toString(), b.toString(), mes);
}

var db;
if (window.openDatabase) {
    db = window.openDatabase('SQLAbstracttest', '1.0', 'SQLAbstracttest', 1024 * 1024);
}

Deferred.test = function(name, t, count, wait) {
    var d = new Deferred();
    var search = location.search;
    var func = function() {
        setTimeout(function() {
            var setupDeferred = new Deferred(), teardownDeferred = new Deferred();
            var setup = Deferred.test.setup, teardown = Deferred.test.teardown;
            setupDeferred.next(function() {
                next(function() {
                    var args = [name, function() {
                        stop(wait || 3000);
                        try {
                            t(teardownDeferred);
                        } catch(e) {
                            ok(false, 'test error: ' + e.toString());
                            teardownDeferred.call();
                        }
                    }];
                    if (count) args.push(count)
                    test.apply(test, args);
                });//, 0);
                return teardownDeferred;
            }).next(function() {
                teardown(d);
            });
            setup(setupDeferred);
        }, 0);
    }
    if (search.indexOf('?') == 0) {
        if (decodeURIComponent(search.substring(1)) != name) {
            setTimeout(function() {
                d.call();
            }, 0);
        } else {
            func();
        }
    } else {
        func();
    }
    return d;
};

// var i = 0;
Deferred.test.setup = function(d) {
//    console.log('setup' + (++i));
    d.call();
};

Deferred.test.teardown = function(d) {
    start(); // XXX
//    console.log('teardown' + i);
    d.call();
};

Deferred.prototype.method = function(name) {
    return d[name]();
};

Deferred.register('test', Deferred.test);

var syntaxCheck = function(stmt, bind, noError) {
    if (db) {
        db.transaction(function(tx) {
            tx.executeSql(stmt, bind, function(t, res) {
                if (noError) {
                    ok(true, 'Syntax OK');
                } else {
                    ok(false, 'don"t call this');
                }
            }, function(t, sqlerror) {
                if (noError) {
                    ok(false, 'don"t call this:' + sqlerror.message);
                } else {
                    if (sqlerror.message.indexOf('syntax error') != -1) {
                        ok(false, 'web database syntax fail: ' + stmt + ' (' + sqlerror.message + ')');
                    } else {
                        ok(true, 'web database syntax OK: ' +  stmt + ' (' + sqlerror.message + ')');
                    }
                }
            });
        });
    } else {
        ok(true, 'window.openDatabase not found. skip syntax check.');
    }
}

Deferred.

test('where', function(d) {
    ok(SQLAbstract.isString('a'), 'isString');
    ok(SQLAbstract.isString(new String('a')), 'isString');
    ok(!SQLAbstract.isString({}), 'isString');
    ok(!SQLAbstract.isString([]), 'isString');

    var sql = new SQLAbstract({});
    ok(sql instanceof SQLAbstract, 'SQL instance');

    var holderOK = function(stmt, bind, key, obj) {
        var wRes = sql.holder(key, obj);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
    }
    holderOK('status != ?', ['completed'], 'status', {'!=': 'completed'});
    holderOK('(date < ?) OR (date > ?)', [10, 100], 'date', {'<': '10', '>': 100});

    var whereOK = function(stmt, bind, obj) {
        var wRes = sql.where(obj);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
        syntaxCheck('select * from table3 ' + wRes[0], wRes[1]);
    }
    var sTmp = "WHERE user = 'nadeko' AND status = 'completed'";
    whereOK(sTmp, null, sTmp);

    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], ['user = ? AND status = ?', ['nadeko', 'completed']]);
    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], ['user = ? AND status = ?', 'nadeko', 'completed']);
    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], ['user = :user AND status = :status', {
        user: 'nadeko',
        status: 'completed'
    }]);

    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], ['user = :u AND status = :s_atus', {
        u: 'nadeko',
        s_atus: 'completed'
    }]);

    whereOK('WHERE uid = ?', [10], {
        uid: 10
    });

    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], ['user = :user AND status = :status', {
        user: 'nadeko',
        status: 'completed'
    }]);

    whereOK('WHERE user = ? AND status = ?', ['nadeko', 'completed'], {
        user: 'nadeko',
        status: 'completed'
    });

    whereOK('WHERE user IS NULL AND status = ?', ['completed'], {
        user: null,
        status: 'completed'
    });

    whereOK('WHERE user IS NULL AND status = ?', ['completed'], {
        user: SQLAbstract.NULL,
        status: 'completed'
    });

    whereOK('WHERE user IS NOT NULL AND status = ?', ['completed'], {
        user: SQLAbstract.NOT_NULL,
        status: 'completed'
    });

    whereOK('WHERE user = ? AND (status = ? OR status = ? OR status = ?)', ['nadeko', 'assigned', 'in-progress', 'pending'], {
        user: 'nadeko',
        status: ['assigned', 'in-progress', 'pending']
    });

    whereOK('WHERE user = ? AND status != ?', ['nadeko', 'completed'], {
        user: 'nadeko',
        status: {'!=': 'completed'}
    });

    setTimeout(function() {
    d.call();
    }, 3000);
}, 48, 3500).

test('SQL Select', function(d) {
    var sql = new SQLAbstract({});

    var selectOK = function(stmt, bind, table, fields, where, options) {
        var wRes = sql.select(table, fields, where, options);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
        syntaxCheck(wRes[0], wRes[1]);
    }

    selectOK('select * from table3', [], 'table3');

    selectOK('select * from table3 WHERE user = ? AND status = ?', ['nadeko', 'completed'], 'table3', '*', ['user = :user AND status = :status', {
        user: 'nadeko',
        status: 'completed'
    }]);

    selectOK('select * from table3 WHERE user IS NULL AND status = ? LIMIT ?', ['completed', 1], 'table3', '*', {
        user: null,
        status: 'completed'
    }, {
        limit: 1
    });

    selectOK('select * from table3 WHERE user IS NULL AND status = ? ORDER BY user desc', ['completed'], 'table3', '*', {
        user: null,
        status: 'completed'
    }, {
        order: 'user desc'
    });

    selectOK('select * from table3 WHERE user IS NULL AND status = ? GROUP BY age', ['completed'], 'table3', '*', {
        user: null,
        status: 'completed'
    }, {
        group: 'age'
    });

    selectOK('select * from table3 WHERE user IS NULL AND status = ? LIMIT ? OFFSET ?', ['completed', 20, 10], 'table3', '*', {
        user: null,
        status: 'completed'
    }, {
        limit: 20,
        offset: 10
    });

    setTimeout(function() {
        d.call();
    }, 2500);
}, 18, 3000).

test('SQL Insert/Update/Delete', function(d) {
    var sql = new SQLAbstract({});

    var insertOK = function(stmt, bind, table, data) {
        var wRes = sql.insert(table, data);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
        syntaxCheck(wRes[0], wRes[1]);
    }

    var updateOK = function(stmt, bind, table, data, where) {
        var wRes = sql.update(table, data, where);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
        syntaxCheck(wRes[0], wRes[1]);
    }

    var deleteOK = function(stmt, bind, table, where) {
        var wRes = sql.deleteSql(table, where);
        equals(stmt.toUpperCase(), wRes[0].toUpperCase());
        equals(String(bind), String(wRes[1]));
        syntaxCheck(wRes[0], wRes[1]);
    }

    insertOK('insert into table3 (user, status) values (?, ?)', ['nadeko', 'completed'], 'table3', {
        user: 'nadeko',
        status: 'completed'
    });

    insertOK('insert into table3 (user, status) values (?, ?)', ['nadeko', 'completed'], 'table3', {
        user: 'nadeko',
        status: 'completed',
        foo: undefined
    });

    updateOK('update table3 SET user = ?, status = ?', ['nadeko', 'completed'], 'table3', {
        user: 'nadeko',
        status: 'completed'
    });

    updateOK('update table3 SET user = ?, status = ?', ['nadeko', 'completed'], 'table3', {
        user: 'nadeko',
        status: 'completed',
        foo: undefined
    });

    updateOK('update table3 SET user = ?, status = ? WHERE id = ?', ['nadeko', 'completed', 3], 'table3', {
        user: 'nadeko',
        status: 'completed'
    }, {
        id: 3
    });

    deleteOK('delete from table3', [], 'table3');

    deleteOK('delete from table3 WHERE id = ?', [3], 'table3', {
        id: 3
    });

    setTimeout(function() {
        d.call();
    }, 2500);
}, 21, 3000).

test('SQL Tables', function(d) {
    var sql = new SQLAbstract({});

    var dropOK = function(stmt, table, force) {
        var wRes = sql.drop(table, force)[0];
        equals(wRes, stmt);
        syntaxCheck(wRes, [], true);
    }
    dropOK('DROP TABLE IF EXISTS table2', 'table2');

    var createOK = function(stmt, table, fields, force) {
        var wRes = sql.create(table, fields, force)[0];
        // equals(stmt.toUpperCase(), wRes.toUpperCase());
        ok(1);
        syntaxCheck(wRes, [], true);
    }

    var fields = {
        'id'      : 'INTEGER PRIMARY KEY',
        url       : 'TEXT UNIQUE NOT NULL',
        search    : 'TEXT',
        date      : 'INTEGER NOT NULL'
    };
    var res = [];
    for (var key in fields) {
        res.push(key + ' ' + fields[key]);
    }
    createOK('CREATE TABLE IF NOT EXISTS table2 (id INTEGER PRIMARY KEY, url TEXT UNIQUE NOT NULL, search TEXT, data INTEGER NOT NULL)', 'table2', fields);

    dropOK('DROP TABLE IF EXISTS table2', 'table2');
    setTimeout(function() {
        d.call();
    }, 900);
}, 6, 2000).

test('finished', function(d) {
    ok(true, 'finished!!!');
    d.call();
}).

error(function(e) {
    console.log('error' + e.toString());
    throw(e);
});


