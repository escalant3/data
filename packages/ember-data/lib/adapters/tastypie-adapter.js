require("ember-data/core");
require("ember-data/system/adapters");

DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  tastypieApiUrl: null,

  find: function(store, type, id) {
    var root = this.rootForType(type);
    var url = [root, id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        store.load(type, json);
      }
    });
  },

  findMany: function() {
    this.find.apply(this, arguments);
  },

  findAll: function(store, type) {
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      success: function(json) {
        store.loadMany(type, json["objects"]);
      }
    });
  },

  findQuery: function(store, type, query, modelArray){
    var root = this.rootForType(type);

    this.ajax(root, "GET", {
      data: query,
      success: function(json) {
        modelArray.load(json["objects"]);
      }
    });
  },

  getTastypieUrl: function(url){
    ember_assert("tastypieApiUrl parameters is mandatory.", !!this.tastypieApiUrl);
    return this.tastypieApiUrl + url + "/";
 
  },

  ajax: function(url, type, hash) {
    hash.url = this.getTastypieUrl(url);
    hash.type = type;
    hash.dataType = "json";

    jQuery.ajax(hash);
  }
});


