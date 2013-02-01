var couchdb = require('./couchdb');

exports.installDesignDoc = function () {
    var designDoc = {
      _id: '_design/contributions',

      language: 'javascript',

      filters: {
        'posts': function(doc, req) {
           return (doc._deleted || doc.type === 'post');
        }.toString()
      },

      views: {
        'contributions_by_title': {
            map: function(doc) {
                if (doc.type === 'contribution' && doc.published == true) {
                    emit(doc.title, doc);
                }
            }.toString(),
            reduce: "_count"
        }
      }
    };

    return couchdb.save(designDoc).then (function (res) {
        return couchdb.save({'_id':'config','locale':'en'});
    });
};
