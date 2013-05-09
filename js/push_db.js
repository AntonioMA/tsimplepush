// Let's take all the indexeddb related things here so the other part is cleaner

'use strict';

var PushDb = (function () {
  var DB_NAME = 'tsimplepush_db_sprayer';
  var DB_VERSION = 1.0;
  var DB_TNAME = 'pushEndpoints';
                
  var SELF_EP = 'ep_self';


  var debugPushDb = true;

  var indexedDB = window.mozIndexedDB || window.webkitIndexedDB || window.indexedDB;
  var database = null;

  function debug(msg) {
//    dump('[DEBUG] tsimplepush: ' + msg + '\n');
    console.log('[DEBUG] tsimplepush.PushDb: ' + msg + '\n');
  };

  function init(db_name, version) {

    var dbHandle = indexedDB.open(db_name, version);
    dbHandle.onsuccess = function (event) {
      debugPushDb && debug("IDB.open.onsuccess called");
      database = dbHandle.result;
    };

    dbHandle.onerror = function(event) {
      debugPushDb && 
        debug("Ups! Cannot create or access the database! Error: " + event.target.error);
    };

    dbHandle.onupgradeneeded = function (event) {
      // For this version I will create just one of object store to keep track of 
      // the different pushendpoints I've registered
      // Oh and I'm happily assuming that the operation is always a create.
      debugPushDb && debug("IDB.open.onupgrade called");
      try {
        dbHandle.result.createObjectStore(DB_TNAME, {keyPath: "endpoint"});
      } catch (x) {
        dbHandle.result.deleteObjectStore(DB_TNAME);
        dbHandle.result.createObjectStore(DB_TNAME, {keyPath: "endpoint"});
      }
    }
  };

  
  // pushTable should have a valid IDBDatabase for these methods to work...
  // otherwise they'll happily fail.
  function getNickForEP(aEndpoint, aCallback) {
    var getRequest = database.transaction(DB_TNAME,'readonly').objectStore(DB_TNAME).get(aEndpoint);

    getRequest.onsuccess = function () {
        aCallback(getRequest.result);
    };

    getRequest.onerror = function () {
      debugPushDb && debug("getNickForEP: get.onerror called" + getRequest.error.name);
    };
  };


  // Exercise for the reader: I should probably store the remote endpoints also at some point
  // If only so I can safely kill the server once the system is setup
  function setNickForEP(aEndpoint, aNick, aRemoteEndpoint, aCallback) {
    var putRequest = database.transaction(DB_TNAME,'readwrite').objectStore(DB_TNAME).
      put({endpoint: aEndpoint, nick: aNick, remoteEndpoint: aRemoteEndpoint });
    if (aCallback) {
      putRequest.onsuccess = function () {
        aCallback();
      };
    }
  };

  function getRegisteredNicks(aCallback) {
    var returnedValue = [];
    var store = database.transaction(DB_TNAME,'readwrite').objectStore(DB_TNAME);
    var readAllReq = store.openCursor();
    readAllReq.onsuccess = function () {
      debugPushDb && debug ("getRegisteredNicks: readAllReq.onsuccess called");
      var cursor = readAllReq.result;
      if (!cursor) {
        aCallback(returnedValue);
      } else {
        var getReq = store.get(cursor.key);
        getReq.onsuccess = function () {
          // Don't add myself to the list
          if (getReq.result.endpoint != SELF_EP)
            returnedValue.push(getReq.result);
          cursor.continue();
        };
      }
    };
  };

  function clearDB() {
    var store = database.transaction(DB_TNAME,'readwrite').objectStore(DB_TNAME);
    store.clear();
  }

  init(DB_NAME, DB_VERSION);

  return {
    getNickForEP: getNickForEP,
    setNickForEP: setNickForEP,
    getSelfNick: getNickForEP.bind(undefined,SELF_EP),
    setSelfNick: setNickForEP.bind(undefined,SELF_EP),
    getRegisteredNicks: getRegisteredNicks,
    clearDB: clearDB
  };

})();

/*

// Usage sample
PushDb.setSelfNick('pepito');
PushDb.getSelfNick(function (aValue) {
  console.log("My nick is " + JSON.stringify(aValue));
});
PushDb.setNickForEP('an_invented_ep','friend_of_myself');
PushDb.setNickForEP('other_invented_ep','friend_of_myself');
PushDb.getRegisteredNicks(function (values) {
  values.forEach(function (value) {
    console.log("Read value: "+ JSON.stringify(value));
  });
});

*/
