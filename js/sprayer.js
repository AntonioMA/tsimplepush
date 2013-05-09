var Sprayer = (function() {
  'use strict';

  // Toggle this if/when the server side is installed
  //  var server = undefined;
//  var server = "http://10.95.197.173";
//  var server = "http://10.95.109.122:1080"
  var server = "http://sprayer.hi.inet";

  var debugSprayer = true;

  function debug (msg) {
    console.log('[DEBUG] tsimplepush.sprayer: ' + msg + '\n');
    
  }

  // Doing it generic isn't worth the problem... this expects to get a JSON and will bork otherwise
  function sendXHR(aType, aURL, aData, aSuccessCallback, aFailureCallback) {
      var xhr = new XMLHttpRequest();
      xhr.open(aType, aURL);
      xhr.responseType = "json";
      xhr.overrideMimeType("application/json");
      if (aData) {
        xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        xhr.setRequestHeader("Content-Length", aData.length);
      }
      xhr.onload = function (evt) {
        debugSprayer && debug("sendXHR. XHR success");
        // Error control is for other people... :P
        if (aSuccessCallback)
          aSuccessCallback(xhr.response);
      }
      xhr.onerror = function (evt){
        debugSprayer && debug("sendXHR. XHR failed " + JSON.stringify(evt) + "url: "+ aURL + " Data: " + aData + "RC: " + xhr.responseCode);
        if (aFailureCallback)
          aFailureCallback(evt);
      }

      xhr.send(aData);
    
  }

  var NOTIFY_TOPIC = "/sprayer/accepter/apps/tokes/topics/";
  function notifyTopic(aTopic, aData) {
    var notifyData = {
      "body": aData,
      "msg_ttl": 86400
    };
    server && sendXHR("POST", server + NOTIFY_TOPIC + aTopic + "/publications",
                      JSON.stringify(notifyData));
    
  }

  var SPRAYER_REGEP = "/sprayer/accepter/apps/tokes/endpoints";
  var SPRAYER_TOPIC_SUBS = "/sprayer/accepter/apps/tokes/endpoints/";

  function subscribeToTopic(aTopic, aTransport, aEp_id) {
    // topic_tags: toke/friendNick/myNick (toke/from/to)
    // So to send to a friend I'll have to use topic toke/selfNick/hisNick
    var subscribeData = {
      topic_tags: [aTopic],
      ep_is_transient: false,
      ep_ttl: 28800
    };
    debugSprayer && debug("Subscribing to topic: " + aTopic + "transport: " + aTransport);
    server && sendXHR("POST", server + SPRAYER_TOPIC_SUBS + aTransport + "/" + aEp_id + "/subscriptions",
                      JSON.stringify(subscribeData));
    
  }

  function sendEndpointToServer(aTopic, aEndpoints) {
    for (var transport in aEndpoints) {
      var registerData = {
        transport: transport,
        ep_id: aEndpoints[transport],
        ep_is_transient: false,
        ep_ttl: 28800
      };
      debugSprayer && debug("Creating endpoint: " + registerData.ep_id + "transport: " + transport);
      server && sendXHR("POST", server + SPRAYER_REGEP, JSON.stringify(registerData), 
                        subscribeToTopic(aTopic, transport, registerData.ep_id));
    }
  }

  return {
    sendEndpointToServer: sendEndpointToServer,
    notifyTopic: notifyTopic

  }

})();
