/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 fonera.js : Fonera Javascript helper
 (C) Fon
 Author: Javier Monteagudo (Javier.monteagudo@fon.com)

 This program is free software: you can redistribute it and/or modify it
 under the terms of the GNU General Public License as published by the
 Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful, but
 WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along
 with this program.  If not, see <http://www.gnu.org/licenses/>.


*/



let EXPORTED_SYMBOLS = ["Fonera"];

let Fonera = {

    Application : Components.classes["@mozilla.org/fuel/application;1"]
        .getService(Components.interfaces.fuelIApplication),

    Preferences : Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService),

    nsLoginInfo : new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init"),
    passwordManager : Components.classes["@mozilla.org/login-manager;1"].
        getService(Components.interfaces.nsILoginManager),

    // authentication status:
    AUTHTOKEN : "authToken",
    authError : "ERROR", // Cannot reach the fonera
    authFailed : "FAILED", // Cannot log in

    // discs status:
    DISKS : "disks",
    noDisk : "NODISK", // no disk attached

    // Errors:
    LASTERROR : "foneralasterror",
    // Events:
    onCheckFoneraAvailable : [],
    onAuthenticate : [],
    onCheckDisks : [],

    addEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            Fonera[event].push(callback);
        } catch (e) {
            Fonera.Application.console.log("invalid registration for event "
                                    + event + ": " + callback + ": " + e);
        }
    },

    removeEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            let eventCallbacks = Fonera[event];
            for (let i in eventCallbacks)
                if (callback == eventCallbacks[i])
                    // remove from index i, 1 element
                    eventCallbacks.splice(i,1);
        } catch (e) {
            Fonera.Application.console.log("invalid registration for event "
                                    + event + ": " + callback + ": " + e);
        }
    },

    notify : function(aEvent) {
        for (let i in aEvent) {
            let aCallback = aEvent[i];
            aCallback();
        }
    },

    getUserPref : function(preference) {
        let Preferences = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        if (prefs.prefHasUserValue(preference))
            return prefs.getCharPref(preference);
        else
            return null;
    },

    getUsername : function() {
        return "fonero";
    },

    isPluginEnabled : function() {
        let prefs = Fonera.Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        if (prefs.prefHasUserValue("enabled"))
            return prefs.getBoolPref("enabled");
        else
            return true;
    },

    getPassword : function() {
        let password = '';
        let username = Fonera.getUsername();

        // retrieve password with password manager
        try {
            let logins = Fonera.passwordManager.findLogins({}, 'chrome://foneradownloader', null, 'Fonera user Login');
                for (let i = 0; i < logins.length; i++) {
                    if (logins[i].username == username) {
                        password = logins[i].password;
                        break;
                    }
                }
        } catch(e) {
            Fonera.Application.console.log(e);
        }
        return password;
    },

    // url for reaching the fonera.
    foneraURL : function () {
        let prefs = Fonera.Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        let onwan = prefs.getBoolPref("onwan");
        let password = Fonera.getPassword();
        if (!onwan)
            return "http://" + this.getUserPref("foneraip") + "/luci";
        else {
            return "https://" + this.getUsername() + ":" + encodeURIComponent(password) + "@"
                + this.getUserPref("foneraip") + "/luci";
        }
    },

    authenticated : function(authToken) {
        if (!Fonera.isPluginEnabled())
            return false;
        return (authToken != null && authToken != Fonera.authFailed
                && authToken != Fonera.authError);
    },

    notifyAllEvents : function() {
        this.notify(this.onCheckFoneraAvailable);
        this.notify(this.onAuthenticate);
        this.notify(this.onCheckDisks);
    },

    checkFoneraAvailable: function() {
        // do we want to re-authenticate?
        let reAuth = false;
        reAuth = (arguments.length == 1 && arguments[0] == true);
        let authToken = Fonera.Application.storage.get(this.AUTHTOKEN, null);
        if (reAuth) {
            // disable sessions:
            Fonera.Application.console.log("Disable session storage");
            Fonera.Application.storage.set(this.AUTHTOKEN, null);
            Fonera.Application.storage.set(this.FONERADOWNLOADS, []);
            Fonera.Application.storage.set(this.FONERATORRENTS, []);
            Fonera.Application.storage.set(this.DISKS, null);
            this.notifyAllEvents();
        }

        if (!this.isPluginEnabled()) {
            if (!reAuth) {
                this.notifyAllEvents();
            }
            return;
        }

        if (!reAuth && this.authenticated(authToken)) {
            Fonera.Application.console.log("already authenticated\n");
            this.notify(this.onAuthenticate);
            return;
        }

	// checks if we can reach the luci interface
	let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
	    .createInstance(Components.interfaces.nsIXMLHttpRequest);

	let url = this.foneraURL();
        Fonera.Application.console.log("Checking URL : " + url + "\n");
	req.open('GET', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
	req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
	        if(req.status == 200) {
                    Fonera.authenticate(reAuth);
	        } else {
                    Fonera.Application.storage.set(Fonera.AUTHTOKEN, Fonera.authError);
                    Fonera.Application.console.log("Fonera NOT ready\n");
	        }
                Fonera.notify(Fonera.onCheckFoneraAvailable);
	    }
	};
	req.send(null);
    },

    authenticate: function(reAuth) {
        let authToken = Fonera.Application.storage.get(this.AUTHTOKEN, null);
        if (!reAuth && this.authenticated(authToken)) {
            Fonera.Application.console.log("already authenticated\n");
            this.notify(this.onAuthenticate);
            return;
        }

        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);
        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);
        let url =  this.foneraURL() + "/fon_rpc/ff/auth";
        let stream = nJSON.encode({"method": "plain",
            "params" : [this.getUsername(),
                        Fonera.getPassword()] });

        Fonera.Application.console.log("Authenticating to URL : " + url + "\n");
        Fonera.Application.console.log("POST : " + stream + "\n");

        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
                Fonera.Application.console.log("Response :" + req.responseText + "\n");
    	        if(req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    if (response.error == null && response.result != null) {
                        Fonera.Application.console.log(Fonera.AUTHTOKEN + " : " + response.result);
                        Fonera.Application.storage.set(Fonera.AUTHTOKEN, response.result);
                        // Fonera.checkDisks();
                    } else {
                        Fonera.Application.storage.set(Fonera.AUTHTOKEN, Fonera.authFailed);
                        Fonera.Application.console.log("Authentication FAILED\n");
                    }
                    Fonera.notify(Fonera.onAuthenticate);
    	        }
            }
        };
        req.send(stream);
    },

    checkDisks : function() {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Fonera.Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken)) {
            Fonera.Application.console.log("Not authenticated\n");
            return;
        }

        // https://developer.mozilla.org/En/Using_XMLHttpRequest
        // https://developer.mozilla.org/en/nsIJSON
        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);

        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);

        //luci/fon_rpc/ff?auth=62BAAF5E1E2A16D78C31AEB7C5F8D9C8
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        let rpcCall = {"method": "get_discs"};
        let stream = nJSON.encode(rpcCall);

        Fonera.Application.console.log("POST : " + stream + "\n");

        // async even if dialog is closed:
        req.mozBackgroundRequest = true;
        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Fonera.Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    if (response.error == null) {
                        if (response.result == null) {
                            Fonera.Application.console.log("No disks found");
                            Fonera.Application.storage.set(Fonera.DISKS, Fonera.noDisk);
                        } else {
                            Fonera.Application.storage.set(Fonera.DISKS, response.result);
                        }
                    } else {
                        Fonera.Application.console.log("Response Error: " + response.error + "\n");
                    }
                    Fonera.notify(Fonera.onCheckDisks);
                } else {
                    Fonera.Application.console.log("Http Status Error :" + req.status + "\n");
                }
            }
        };
        req.send(stream);
    },

    hasDisk : function() {
        let disks = Fonera.Application.storage.get(Fonera.DISKS, Fonera.noDisk);
        return (disks != Fonera.noDisk);
    },

    loadEvents : function() {
        Fonera.addEventListener("onAuthenticate",
                                Fonera.checkDisks);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onAuthenticate",
                                Fonera.checkDisks);
    }

};
