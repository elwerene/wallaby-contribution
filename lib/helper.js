var couchdb    = require('./couchdb')
  , installer  = require('./installer')
  , q          = require('promised-io/promise')
  , $          = require('jquery')
  , uuid       = require('node-uuid')
  , fs         = require('fs')
  , easyimg    = require('easyimage')
  , util       = require('util')
  , partials   = require('./partials')
  , i18n       = require("i18n");

try {
    var settings = require('../../../settings');
} catch (e) {
    util.log('Could not load settings.json');
    return;
}

//set available locales
locales().then(function(locales) {
    i18n.configure({
        locales:locales,
        register:global
    });
});

setLocale();

function setLocale() {
    config().then(function(config) {
        i18n.setLocale(config.locale);
    }, function(err) {
        i18n.setLocale('en');
    });
};

exports.setLocale = function () {
    return setLocale();
};

function locales() {
    var defer = q.defer();

    fs.readdir('locales',function (err,files) {
        if (err) {
            util.log('locale error: ',err);
            defer.reject(err);
        } else {
            var locales = [];
            for (i in files) {
                locales.push(files[i].slice(0,-3));
            }
            defer.resolve(locales);
        }
    });

    return defer.promise;
}

exports.locales = function () {
    return locales();
};

exports.readFile = function (file) {
    var defer = q.defer();

    try {
        fs.readFile(file, function (err,data) {
            if (err) {
                util.log("could not read file("+file+"): "+err);
                defer.reject(err);
            } else if (data) {
                defer.resolve(data);
            }
        });
    } catch (e) {
        util.log('Could not read file: '+e);
        defer.reject(e);
    }

    return defer.promise;
};

exports.resizeImage = function (file) {
    var defer = q.defer();

    try {
        easyimg.info(file, function (err,stdout,stderr) {
            if (stdout) {
                var width=parseInt(stdout['width']);
                var height=parseInt(stdout['height']);

                if (width>800 || height>800) {
                    if (width>height) {
                        height=(height/width)*800;
                        width=800;
                    }else {
                        height=800;
                        width=(width/height)*800;
                    }
                    easyimg.resize({"src":file,"dst":file,"width":width,"height":height},function(err,stdout,stderr){
                        defer.resolve(file);
                    });
                } else {
                    defer.resolve(file);
                }
            } else {
                defer.resolve(file);
            }
        });
    } catch (e) {
        util.log('Could not resize image: '+e);
        defer.resolve(file);
    }

    return defer.promise;
};

exports.translator = function() {
    return function(str){
        return __(str);
    };
}

function config () {
    var defer = q.defer();

    couchdb.get('config').then(function (config) {
        defer.resolve(config);
    }, function (err) {
        defer.reject(err);
    });

    return defer.promise;
}

exports.config = function () {
    return config();
};

function prepareContribution (contribution) {
    try {
        //TODO
    } catch (e) {
        util.log('Could not prepare contribution: '+e+" ("+JSON.stringify(contribution)+")");
    }

    return contribution;
}

exports.prepareContribution = function (contribution) {
    return prepareContribution(contribution);
};

exports.contributions = function (viewEngine) {
    return config().then(function(config) {
        try {
            locals={'config':config};

            var path = 'contributions/contributions_by_title';
            var options = {"reduce":false};

            return couchdb.view(path,options).then(function(res) {
                var contributions = res['rows'].map(function(row) {
                        return prepareContribution(row['value']);
                    }
                );

                locals["contributions"]=contributions;

                return viewEngine.respond('contributions.html', {locals:locals,partials:partials.list});
            });
        } catch (e) {
            util.log('Could not load contributions: '+e);
            return viewEngine.respond('contributions.html', {locals:{"error":true,"message":"Unknown error."}});
        }
    },function(err) {
        if (err.reason == "no_db_file") {
            return viewEngine.respond('contributions.html', {locals:{"error":true,"message":"Database does not exist.","solutionText":"Create Database ("+settings.couchdb.db+")","solutionURL":"/admin/createDatabase"}});
        } else if (err.reason != undefined) {
            return viewEngine.respond('contributions.html', {locals:{"error":true,"message":"Design Document Missing.","solutionText":"Install Design Document","solutionURL":"/admin/installDesignDocument"}});
        } else {
            return viewEngine.respond('contributions.html', {locals:{"error":true,"message":"CouchDB server not reachable."}});
        }
  });
};

function attachmentUrl (docID, attachmentName) {
    if (settings.couchdb.user != undefined && settings.couchdb.password != undefined) {
        return 'http://'+settings.couchdb.user+':'+settings.couchdb.password+'@'+settings.couchdb.host+':'+settings.couchdb.port+'/'+settings.couchdb.db+'/'+docID+'/'+attachmentName;
    } else {
        return 'http://'+settings.couchdb.host+':'+settings.couchdb.port+'/'+settings.couchdb.db+'/'+docID+'/'+attachmentName;
    }
}

exports.attachmentUrl = function (docID, attachmentName) {
    return attachmentUrl(docID, attachmentName);
};
