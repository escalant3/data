require("ember-data/core");
require("ember-data/system/adapters");

DS.DjangoTastypieAdapter = DS.RESTAdapter.extend({
  tastypieApiUrl: "api/v1/",
  bulkCommit: false,

  createRecord: function(store, type, model) {
    var root = this.rootForType(type);

    var data = JSON.stringify(get(model, 'data'));

    this.ajax(root, "POST", {
      data: data,
      success: function(json) {
        store.didCreateRecord(model, json);
      }
    });
  },
    
  updateRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);

    var data = JSON.stringify(get(model, 'data'));

    var url = [root, id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        store.didUpdateRecord(model, json[root]);
      }
    });
  },

  deleteRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);

    var url = [root, id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        store.didDeleteRecord(model);
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);
    var url = [root, id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        console.log(json);
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
    hash.contentType = 'application/json';
    jQuery.ajax(hash);
  },

  pluralize: function(name) {
    return name;
  }
});
