// The main flow of the app goes here...

'use strict';

var TokesApp = (function () {
  var debugTokes = true;

  function debug (msg) {
    console.log('[DEBUG] tsimplepush.tokesApp: ' + msg + '\n');
    
  }
  var self = this;
  var selfNick = "";
  var selfPhone = "";


//////////////////////////////////////////////////////////////////////////////
// This exist so I don't have to keep remembering how to do it...
//////////////////////////////////////////////////////////////////////////////
  function addText(elem,text) {
    elem.appendChild(document.createTextNode(text));
  }

  function createElementAt(mainBody,type,id,optionalText,before) {
    var elem=document.createElement(type);
    elem.setAttribute("id",id);
    if (!before) {
        mainBody.appendChild(elem);
    } else {
        mainBody.insertBefore(elem,before);
    }
    if (optionalText) {
        addText(elem,optionalText);
    }
    return elem;
  }
//////////////////////////////////////////////////////////////////////////////
// End of useful DOM manipulation...
//////////////////////////////////////////////////////////////////////////////


  // Form elements and the rest...

  var selfNickField = null;
  var selfPhoneField = null;

  var loginButton = null;
  var mainWrapper = null;
  var selfNickWrapper = null;
  var addFriendButton = null;
  var friendsContainer = null;
  var friendNickField = null;

  var myFriends = [];

  // Return false also if the friend exist but isn't registered (so we can talk to him but not the reverse)
  // And yeah, I know, for some value of 'talk'
  function isAlreadyAFriend(aNick) {
    for (var i in myFriends) {
      if ((myFriends[i].nick === aNick) && (myFriends[i].endpoint))
        return true;
    }
    return false;
  }

  function composeTopic(aFrom, aTo) {
    return "toke." + aFrom + "." + aTo;
  }

  // What I'll have on the HTML:
  // <ul id='all-friends-lists' class="whatever">
  //   <li id='friend-id-' + nick onclick="clickOnFriend(ep);"> Nick </li>
  // </ul>
  function updateFriendList() {
    // I could prolly do this on a nicer way, but this works also...
    friendsContainer.innerHtml = '';
    
    // The way this works is: 
    var ul = createElementAt(friendsContainer, "ul", "ul-friend-list");
    for (var i in myFriends) {
      var canToke = ". Send Toke!";
      var isMyFriend = "";
      var li = createElementAt(ul, "li", "li-nick-"+myFriends[i].nick, isMyFriend + myFriends[i].nick + canToke );
      if (true) {
        li.onclick = function() {
          debugTokes && debug("Somebody clicked! Sending Toke to " + arguments[0]);
          Sprayer.notifyTopic(arguments[0],"Hola de tu amigo " + arguments[1]);
        }.bind(undefined, composeTopic(selfNick, myFriends[i].nick), selfNick) ;
      }
    }
  }

  function addFriendEP(aNick, aEndpoint) {
    var ul=document.getElementById("ul-friend-list") || createElementAt(friendsContainer, "ul", "ul-friend-list");
    // TO-DO TO-DO TO-DO: CHANGE TO ADD CORRECTLY THE HANDLER!!!!!
    var li = document.getElementById("li-nick-" + aNick) || createElementAt(ul, "li", "li-nick-" + aNick, aNick ". Send Toke!);
    li.onclick = function () {
      debugTokes && debug("Somebody clicked! Sending Toke to " + arguments[0]);
      Sprayer.notifyTopic(arguments[0],"Hola de tu amigo " + arguments[1]);
    }.bind(undefined, composeTopic(selfNick, aNick), selfNick) ;

    PushDb.setNickForEP(aEndpoint, aNick);
    Sprayer.sendEndpointToServer(composeTopic(aNick, selfNick), {
      sms: selfPhone, 
      owd: encodeURIComponent(window.btoa(aEndpoint))
    });
    var added = false;
    for (var i in myFriends) {
      if (myFriends[i].nick === aNick) {
        myFriends[i].endpoint = aEndpoint;
        added = true; 
        break;
      }
    }
    if (!added) {
      myFriends.push({
          nick: aNick,
          endpoint: aEndpoint,
          remoteEndpoint: undefined
      });
    }
    
  }

  function mixFriends(myRemoteFriends) {
    for (var i in myRemoteFriends) {
      for(var j in myFriends) {
        if (myFriends[j].nick === myRemoteFriends[i].nick) {
          if (myFriends[j].remoteEndpoint != myRemoteFriends[i].endpoint) {
            myFriends[j].remoteEndpoint = myRemoteFriends[i].endpoint;
            PushDb.setNickForEP(myFriends[j].endpoint, myFriends[j].nick, myFriends[j].remoteEndpoint);
          }
          myRemoteFriends[i].alreadyAdded = true;
          break; // We found it, no need to continue
        }
      }
    }
    for (var i in myRemoteFriends) {
      if (!myRemoteFriends[i].alreadyAdded) {
        // Should I add it without a local endpoint? I could but not with the DB as currently defined
        // So tough luck...
        // I could use a trick here but let's leave that for V2. Or for the reader. Whatever.
        myFriends.push({
          nick: myRemoteFriends[i].nick, 
          remoteEndpoint: myRemoteFriends[i].endpoint, 
          endpoint: undefined
        });
      }
    }
    
    updateFriendList();
    
  }


  function loadMyRemoteFriends() {
    // Not needed anymore... either the channel exists or it doesn't...
    mixFriends([]);
  }

  function saveFriendsToRemote() {
    // TO-DO!!!!! Is this really needed????
    for (var i in myFriends) {
      Sprayer.sendEndpointToServer(composeTopic(myFriends[i].nick, selfNick), {sms: selfPhone, owd: encodeURIComponent(window.btoa(myFriends[i].endpoint)}));
    }
  }


  // Self explanatory :P
  function onLoginClick(evt) {
    if (evt && evt.preventDefault)
      evt.preventDefault();
    debugTokes && debug("onLoginClick called");
    if ((selfNickField.value !== selfNick) || selfPhoneField.value !== selfPhone){
      selfNick = selfNickField.value;
      selfPhone = selfPhoneField.value;
      PushDb.setSelfNick(selfNick + ":" + selfPhone);
    }
    selfNickWrapper.style.display = 'none';
    mainWrapper.style.display = '';
    PushDb.getRegisteredNicks(function (internalFriends) {
      myFriends = internalFriends;
      saveFriendsToRemote();
      loadMyRemoteFriends();
    });
    
  }


  // aNick, for this version should take the form nick:phone
  function setSelfNick(aNick) {
    debugTokes && debug("setSelfNick called with: " + JSON.stringify(aNick));
    if (aNick && aNick.nick) {
      debugTokes && debug("setting selfNick to " + aNick.nick);
      var comp = aNick.nick.split(":");
      selfNick = comp[0];
      selfPhone = comp[1];
    } else {
      selfNick = "";
      selfPhone = "";
    }
    selfNickField.value = selfNick || "";
    selfPhoneField.value = selfPhone || "";
  }

  function onAddFriendClick(evt) {
    if (evt && evt.preventDefault)
      evt.preventDefault();
    var aNick = friendNickField.value;
    // If this fails this isn't going to be funny
    friendNickField.value = ""; 
    addFriendButton.disabled = true;

    if (isAlreadyAFriend(aNick)) {
      // Should probably inform the user... naaaah
      debugTokes && debug("Nasty user! Trying to add an existing friend " + aNick + " no cookie!");
    } else {
        Push.getNewEndpoint(true, addFriendEP.bind(undefined, aNick));
    }

  }

  function onFriendNickChange() {
    addFriendButton.disabled = friendNickField.value === "";
  }

  function init() {
    debugTokes && debug("init called");

    selfNickField = document.getElementById("self-nick");
    selfPhoneField = document.getElementById("self-phone");
    loginButton = document.getElementById("login-button");
    addFriendButton = document.getElementById("add-friend-button");
    mainWrapper = document.getElementById("main-window");
    friendsContainer = document.getElementById("friends-container");
    mainWrapper.style.display = 'none'; // I'm pretty sure there's a better way to do this!!!
    selfNickWrapper = document.getElementById("self-nick-wrapper");
    friendNickField = document.getElementById("friend-to-add");


    // Event Listeners
    document.getElementById("login-form").addEventListener('submit',onLoginClick);
    document.getElementById("add-friend-form").addEventListener('submit',onAddFriendClick);
    loginButton.addEventListener('click',onLoginClick);
    friendNickField.addEventListener('input', onFriendNickChange);

    // Register the push handler
    Push.setPushHandler(function (e) {
      processNotification(e.pushEndpoint);
    });

    // load the initial value for selfNick
    PushDb.getSelfNick(setSelfNick);

  }

  function processNotification(aEndpoint) {
    // This should work on an uninitialized app...
    PushDb.getNickForEP(aEndpoint,function (aValue) {
      if (aValue && aValue.nick) {
        
        var notification = window.navigator.mozNotification.createNotification('Tokes App', 'Got a Toke from ' + aValue.nick);

        notification.onclick = function test_notificationClick() {
          // To-do: we should bring ourselves to foreground, maybe
          debugTokes && debug("notification clicked!");
          // Bring app to foreground
          /*
          navigator.mozApps.getSelf().onsuccess = function getSelfCB(evt) {
            var app = evt.target.result;
            app.launch('push');
          };
           */
        };
      
        notification.show();
      } else {
        debugTokes && debug("Got an unexpected notification!");
      }
    });
  }

  return {
    init: init,
    processNotification: processNotification

  }

})();


window.addEventListener('load', function showBody() {
  console.log("loadHandler called");
  TokesApp.init();

});
