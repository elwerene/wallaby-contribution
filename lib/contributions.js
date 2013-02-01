var bogart     = require('bogart')
  , couchdb    = require('./couchdb')
  , helper     = require('./helper')
  , installer  = require('./installer')
  , $          = require('jquery')
  , uuid       = require('node-uuid')
  , util       = require('util')
  , partials   = require('./partials');

try {
    var settings = require('../../../settings');
} catch (e) {
    util.log(__('Could not load settings.json'));
    return;
}

var viewEngine = bogart.viewEngine('mustache')
  , router     = bogart.router();

var origRespond = viewEngine.respond.bind(viewEngine);
viewEngine.respond = function(template, config) {
    if(config.locals == undefined) config.locals = {};
    config.locals.__ = helper.translator;
    return origRespond(template, config);
};

adminError = function()
{
    return function(err){
        return viewEngine.respond('contributions.html', {locals:{"error":true,"message":__("Unknown Error")}});
    };
};
 
router.get('/', function(req) {
    return helper.contributions(viewEngine);
});

router.get('/:contribution', function(req) {
    return helper.config().then(function(config) {
        return couchdb.get(req.params.contribution).then(function(contribution) {
            contribution = helper.prepareContribution(contribution);
            contribution['config']=config;

            return viewEngine.respond('contribution.html', {locals:contribution,partials:partials.list});
        }, function(err) {
        return viewEngine.respond('404.html', {locals:{'config':config},partials:partials.list});
    });
    }, adminError());
});

router.get('/images/:id/:attachment', function(req) {
    return bogart.proxy(helper.attachmentUrl(req.params.id, req.params.attachment));
});

// ADMIN ACTIONS

router.get('/admin/installDesignDocument', function(req) {
    return installer.installDesignDoc().then(function () {
        return bogart.redirect('/');
    }, adminError());
});

router.get('/admin/createDatabase', function(req) {
    return couchdb.createDatabase().then(function () {
        return bogart.redirect('/');
    }, adminError());
});


process.on('uncaughtException', function(err) {
    util.log('Caught exception: ',err);
});

exports.start = function () {
    var app = bogart.app();
    app.use(bogart.batteries);
    app.use(router);
    app.start(settings.listenPort);
}
