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

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

let Preferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);

Components.utils.import("resource://modules/format.js");

let Fonera = {
    // authentication status:
    AUTHTOKEN : "authToken",
    authError : "ERROR", // Cannot reach the fonera
    authFailed : "FAILED", // Cannot log in

    // Transmission data:
    TRANSSESSION : "X-Transmission-Session-Id",

    // discs status:
    DISKS : "disks",
    noDisk : "NODISK", // no disk attached

    FONERADOWNLOADS : "foneradownloads",
    // Errors while sending urls:
    LASTERROR : "foneralasterror",
    // Events:
    onCheckFoneraAvailable : [],
    onDownloadsAvailable : [],
    onAccountsUpdates : [],
    onSendUrl : [],

    // Accounts:
    ACCOUNTS : "ACCOUNTS",
    ACCOUNTERROR : "account-error",
    ACCOUNTDELERROR : "account-delete-error",
    NOACCOUNTERROR : "no-account-for-link",
    EMPTY_ACCOUNTS : [],
    DOMAINS : "megaupload|rapidshare",

    addEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            this[event].push(callback);
        } catch (e) {
            Application.console.log("invalid event registration " + e);
        }
    },

    removeEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            let eventCallbacks = this[event];
            for (let i in eventCallbacks)
                if (callback == eventCallbacks[i])
                    // remove from index i, 1 element
                    eventCallbacks.splice(i,1);
        } catch (e) {
            Application.console.log("invalid event registration " + e);
        }
    },

    notify : function(aEvent) {
        for (let i in aEvent) {
            let aCallback = aEvent[i];
            aCallback();
        }
    },

    getUserPref : function(preference) {
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        return prefs.getCharPref(preference);
    },

    isPluginEnabled : function() {
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        return prefs.getBoolPref("enabled");
    },

    // url for reaching the fonera.
    foneraURL : function () {
        return "http://" + this.getUserPref("foneraip") + "/luci";
    },

    transmissionUrl : function () {
        let transCredentials = this.getUserPref("username")
            + ":" + this.getUserPref("password") + "@";
        let url = "http://" + transCredentials + this.getUserPref("foneraip")
            + ":9091/transmission/rpc";
        return url;
    },

    authenticated : function(authToken) {
        if (!this.isPluginEnabled())
            return false;
        return (authToken != null && authToken != this.authFailed
                && authToken != this.authError);
    },

    checkFoneraAvailable: function() {
        // do we want to re-authenticate?
        let reAuth = false;
        reAuth = (arguments.length == 1 && arguments[0] == true);
        // disable sessions:
        if (reAuth) {
            Application.console.log("Disable session storage");
            Application.storage.set(this.AUTHTOKEN, null);
            Application.storage.set(this.FONERADOWNLOADS, []);
            Application.storage.set(this.DISKS, null);
            Application.storage.set(this.TRANSSESSION, null);
            this.notify(this.onCheckFoneraAvailable);
        }

        if (!this.isPluginEnabled()) {
            if (!reAuth)
                this.notify(this.onCheckFoneraAvailable);
            return;
        }

	// checks if we can reach the luci interface
	let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
	    .createInstance(Components.interfaces.nsIXMLHttpRequest);

	let url = this.foneraURL();
        Application.console.log("Checking URL : " + url + "\n");
	req.open('GET', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
	req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
	        if(req.status == 200) {
                    /**
                     * Fonera.notify(Fonera.onCheckFoneraAvailable):
                     * - We notify failures immediately to detect
                     * errors as soon as posible.
                     * - We notify success on the LAST call so final
                     * status is correctly propagated.
                     */
                    Fonera.authenticate(reAuth);
                    Fonera.authenticateInTransmission();
                    Fonera.checkDisks();
                    Fonera.checkAccountsSettings();
	        } else {
                    Application.storage.set(Fonera.AUTHTOKEN, Fonera.authError);
                    Application.console.log("Fonera NOT ready\n");
                    Fonera.notify(Fonera.onCheckFoneraAvailable);
	        }
	    }
	};
	req.send(null);
    },

    authenticate: function(reAuth) {
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        if (!reAuth && this.authenticated(authToken)) {
            Application.console.log("already authenticated\n");
            this.notify(this.onCheckFoneraAvailable);
            return;
        }
        let url =  this.foneraURL() + "/fon_rpc/ff/auth";
        let rpcCall = {
            "method": "plain",
            "params" : [this.getUserPref("username"), this.getUserPref("password")]
        };
        let callback = function (response) {
            if (response.error == null && response.result != null) {
                Application.storage.set(Fonera.AUTHTOKEN, response.result);
            } else {
                Application.storage.set(Fonera.AUTHTOKEN, Fonera.authFailed);
                Application.console.log("Authentication FAILED\n");
                Fonera.notify(Fonera.onCheckFoneraAvailable);
            }
        };
        this.callRpcInFonera(rpcCall, callback, url);
    },

    authenticateInTransmission : function () {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let url = this.transmissionUrl();
        // https://developer.mozilla.org/En/Using_XMLHttpRequest
        // https://developer.mozilla.org/en/nsIJSON
        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);

        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);

        req.mozBackgroundRequest = true;
        req.open('GET', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 409) {
                    let session = req.getResponseHeader(Fonera.TRANSSESSION);
                    Application.storage.set(Fonera.TRANSSESSION, session);
                }
            }
            // Fonera.notify(Fonera.onCheckFoneraAvailable);
        };
        req.send(null);
    },

    checkDisks : function() {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        if (!this.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
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
        let url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        let rpcCall = {"method": "get_discs"};
        let stream = nJSON.encode(rpcCall);

        Application.console.log("POST : " + stream + "\n");

        // async even if dialog is closed:
        req.mozBackgroundRequest = true;
        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    if (response.error == null) {
                        if (response.result == null) {
                            Application.console.log("No disks found");
                            Application.storage.set(Fonera.DISKS, Fonera.noDisk);
                        } else {
                            Application.storage.set(Fonera.DISKS, response.result);
                        }
                    } else {
                        Application.console.log("Response Error: " + response.error + "\n");
                    }
                } else {
                    Application.console.log("Http Status Error :" + req.status + "\n");
                }
            }
            Fonera.notify(Fonera.onCheckFoneraAvailable);
        };
        req.send(stream);
    },


    pauseDownloadById : function(id) {
        let rpcCall = null; let callback = null;
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let downloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
        let download  = null; let url = null;

        for (let i in downloads) {
            if (downloads[i].id == id)
                download = downloads[i];
        }
        if (download != null && download.type == "torrent") {
            rpcCall = {
                "method":"torrent-stop",
                "arguments": { "ids":[id] }
            };
            callback = function(response) {
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
            url = this.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_pause",
                "params" : [id]
            };
            let authToken = Application.storage.get(this.AUTHTOKEN, null);
            url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error");
                }
                else {
                    Application.storage.set(Fonera.LASTERROR, null);
                }
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
        }
        this.callRpcInFonera(rpcCall, callback, url);
    },

    startDownloadById : function(id) {
        let download  = null; let url = null;
        let rpcCall = null; let callback = null;
        for (let i in downloads) {
            if (downloads[i].id == id)
                download = downloads[i];
        }
        if (download != null && download.type == "torrent") {
            callback = function(response) {
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
            rpcCall = {
                "method":"torrent-stop",
                "arguments":{ "ids":[id] }
                };
            url = this.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_start",
                "params" : [id]
            };
            let Application = Components.classes["@mozilla.org/fuel/application;1"]
                .getService(Components.interfaces.fuelIApplication);

            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error");
                }
                else {
                    Application.storage.set(Fonera.LASTERROR, null);
                }
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
            let authToken = Application.storage.get(this.AUTHTOKEN, null);
            url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        }
        this.callRpcInFonera(rpcCall, callback, url);
    },

    deleteCompletedDownloads : function(id) {
        // we do the same call as in deleteDownloadById, but
        // call the nofity at the end, not on every call
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let downloads = Application.storage.get(this.FONERADOWNLOADS, []);
        for (let i in downloads) {
            if (downloads[i].status == "done") {
                let id = downloads[i].id;
                let rpcCall = null; let callback = null; let url = null;

                if (downloads[i].type == "torrent") {
                    rpcCall = {
                        "method" : "torrent-remove",
                        "arguments": { "ids": [id] }
                    };

                    let callback = function(response) {
                        Fonera.notify(Fonera.onDownloadsAvailable);
                    };
                    url = this.transmissionUrl();
                } else {
                    let authToken = Application.storage.get(this.AUTHTOKEN, null);
                    url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
                    rpcCall = {
                        "method" : "dl_delete",
                        "params" : [id]
                    };

                    let callback = function(response) {
                        if (response.error != null) {
                            Application.console.log("Response Error");
                        } else {
                            Application.storage.set(Fonera.LASTERROR, null);
                        }
                    };
                }
                this.callRpcInFonera(rpcCall, callback, url);
            }
        }
        this.notify(this.onDownloadsAvailable);
    },

    deleteDownloadById : function(id) {
        let rpcCall = null; let download = null;
        let callback = null; let url = null;

        for (let i in downloads) {
            if (downloads[i].id == id)
                download = downloads[i];
        }
        if (download != null && download.type == "torrent") {
            callback = function(response) {
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
            rpcCall = {
                "method":"torrent-remove",
                "arguments": { "ids": [id] }
            };
            url = this.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_delete",
                "params" : [id]
            };
            let Application = Components.classes["@mozilla.org/fuel/application;1"]
                .getService(Components.interfaces.fuelIApplication);

            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error");
                }
                else {
                    Application.storage.set(Fonera.LASTERROR, null);
                }
                Fonera.notify(Fonera.onDownloadsAvailable);
            };
            let authToken = Application.storage.get(this.AUTHTOKEN, null);
            url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        }
        this.callRpcInFonera(rpcCall, callback, url);
    },


    sendDownloadUrlToFonera : function(myUrl) {
        let rpcCall = {
            "method" : "downloads_add",
            "params" : [myUrl]
        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);
        let errorStorage = this.LASTERROR;
        let basename = myUrl.replace( /.*\//, "" );

        // check for rapidshare / megaupload links and if there's an account setup:

        let accounts = Application.storage.get(this.ACCOUNTS, []);
        let domain = myUrl.match(this.DOMAINS);
        let found = false;
        if (domain != null) {
            for (let j in accounts) {
                let service = accounts[j].service.match(domain);
                try {
                    found = (service.toString() == domain.toString());
                    if (found) break;
                }
                catch(e) { /* do nothing */ }
            }

            if (!found) {
                Application.console.log("Found " + domain  + " link and no account associated");
                Application.storage.set(errorStorage, this.NOACCOUNTERROR + ":" + domain);
                return;
            }
        }

        Application.console.log("My URL : " + myUrl + "\n");
        let callback = function(response) {
            if (!response.result.status) {
                Application.storage.set(Fonera.LASTERROR, basename);
                Application.console.log("Response Error");
            } else {
                Application.storage.set(Fonera.LASTERROR, null);
            }
            Fonera.notify(Fonera.onDownloadsAvailable);
        };
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        let url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        this.callRpcInFonera(rpcCall, callback, url);
    },

    sendTorrentUrlToFonera : function(myUrl) {
        // get basename and strip the .torrent in the end as the fonera will add it eventually
        let basename = myUrl.replace( /.*\//, "" ).replace( ".torrent", "" );
        let rpcCall = {
            "method" : "torrent-add",
            "params" : { "arguments" : { "paused" : "false", "filename" : myUrl} }
        };

        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let callback = function(response) {
            if (response.result != "success") {
                Application.storage.set(Fonera.LASTERROR, basename);
                Application.console.log("Response Error");
            }
            else {
                Application.storage.set(Fonera.LASTERROR, null);
            }
            Fonera.notify(Fonera.onDownloadsAvailable);
        };
        let url = this.transmissionUrl();
        this.callRpcInFonera(rpcCall, callback, url);
    },

    callRpcInFonera : function (rpcCall, callback, url) {
        if (!this.isPluginEnabled()) {
            this.notify(this.onCheckFoneraAvailable);
            return;
        }

        // for some reason I need to declare here Application
        // or else it won't be accesible in the onload function
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        // FIXME: this is not needed when going for transmission
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        if (!this.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        // https://developer.mozilla.org/En/Using_XMLHttpRequest
        // https://developer.mozilla.org/en/nsIJSON
        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);

        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);

        let stream = nJSON.encode(rpcCall);

        Application.console.log("Send URL : " + url + "\n");
        Application.console.log("POST : " + stream + "\n");

        // async even if dialog is closed:
        req.mozBackgroundRequest = true;
        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        if (this.transmissionUrl() == url) {
            let session = Application.storage.get(Fonera.TRANSSESSION, null);
            if (session != null)
                req.setRequestHeader(Fonera.TRANSSESSION, session);
        }

        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    callback(response);
                } else {
                    Application.console.log("Http Status Error :" + req.status + "\n");
                }
            }
        };
        req.send(stream);
    },

    checkTorrentsItems : function() {
        if (!Fonera.isPluginEnabled()) {
            return;
        }
        let rpcCall = { "method":"torrent-get",
                          "arguments": { "fields": ["id", "name" ,"status","totalSize", "leftUntilDone" ] }
                      };

        let callback = function (response) {
                if (response.result != null) {
                    let items = response.arguments.torrents.length;
                    let downloads = [];
                    for (let i=0; i < items; i++) {
                        let theDownload = response.arguments.torrents[i];
                        let downloadView = [];
                        downloadView["file"] = theDownload.name;
                        // FIXME: get status:
                        // 8 -> seeding | 4 -> downloading | 16 -> paused
                        downloadView["status"] = theDownload.status;
                        downloadView["type"] = "torrent";
                        downloadView["size"] = theDownload.totalSize;
                        downloadView["id"] = theDownload.id;
                        let whatsdone = ((theDownload.totalSize - theDownload.leftUntilDone)/res.arguments.torrents[0].totalSize);
                        downloadView["downloaded"] = whatsdone*100;
                        downloads.push(downloadView);
                    }
                    let prevDownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
                    downloads = prevDownloads.concat(downloads);
                    Application.storage.set(Fonera.FONERADOWNLOADS, downloads);
                    Application.console.log("Updated downloads storage");
                    Fonera.notify(Fonera.onDownloadsAvailable);
                }
        };
        let url = this.transmissionUrl();
        Fonera.callRpcInFonera(rpcCall, callback, url);
    },

    checkDownloadsItems : function() {
        if (!Fonera.isPluginEnabled()) {
            return;
        }

        let rpcCall = {
            "method" : "dl_list"
        };

        let callback = function (response) {
                if (response.result != null) {
                    let items = response.result.length;
                    let downloads = [];
                    for (let i=0; i < items; i++) {
                        let theDownload = response.result[i];
                        let downloadView = [];
                        // basename:
                        try {
                            downloadView["file"] = theDownload.file.replace( /.*\//, "" );
                        } catch (e) {
                            // error
                            downloadView["file"] = theDownload.uri;
                        }
                        try {
                            //downloadView["status"] = FoneraFormat.stateName(theDownload.status);
                            downloadView["status"] = theDownload.status;
                            downloadView["type"] = theDownload.type;
                            downloadView["size"] = theDownload.size;
                            downloadView["id"] = theDownload.id;

                            if (theDownload.status == "done")
                                downloadView["downloaded"] = "100%";
                            else if (theDownload.percent != null && theDownload.percent != "") {
                                downloadView["downloaded"] = theDownload.percent;
                            } else {
                                downloadView["downloaded"] = "--";
                            }
                        } catch (e) {
                            downloadView["downloaded"] = "0.0%";
                        }
                        downloads.push(downloadView);
                    }
                    let prevDownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
                    downloads = prevDownloads.concat(downloads);
                    Application.console.log("Updated downloads storage");
                    Fonera.notify(Fonera.onDownloadsAvailable);
                }
        };
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        Fonera.callRpcInFonera(rpcCall, callback, url);
    },

    checkDownloads : function() {
        Application.storage.set(Fonera.AUTHTOKEN, []);
        Fonera.checkTorrentsItems();
        Fonera.checkDownloadsItems();
    },

    addAccount : function(provider, username,  password) {
        let rpcCall = {
            "method" : "downloads_createcookie",
            "params" : [provider, username, password]

        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let callback = function(response) {
            if (response.error != null || !response.result || response.result == false) {
                Application.console.log("Response Error. Setting " + Fonera.LASTERROR + " to " + Fonera.ACCOUNTERROR);
                Application.storage.set(Fonera.LASTERROR, Fonera.ACCOUNTERROR);
            }
            // refresh accounts storage
            Fonera.checkAccountsSettings();
        };
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        let url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        this.callRpcInFonera(rpcCall, callback, url);
    },

    deleteAccount : function(id) {
        let rpcCall = {
            "method" : "downloads_removecookie",
            "params" : [id]

        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let callback = function(response) {
            if (response.error != null || !response.result || response.result == false) {
                Application.console.log("Response Error. Setting " + Fonera.LASTERROR + " to " + Fonera.ACCOUNTDELERROR);
                Application.storage.set(Fonera.LASTERROR, Fonera.ACCOUNTDELERROR);
            }
            // refresh accounts storage
            Fonera.checkAccountsSettings();
        };
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        let url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        this.callRpcInFonera(rpcCall, callback, url);
    },

    checkAccountsSettings : function() {
        let rpcCall = {
            "method" : "downloads_listcookies"
        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let callback = function(response) {
            if (response.error != null) {
                Application.console.log("Response Error");
            } else {
                // dont clean first as we are called from add/delete and
                // we can have errors pending for reading
                Application.storage.set(Fonera.ACCOUNTS, Fonera.EMPTY_ACCOUNTS);
                let accounts = Application.storage.get(Fonera.ACCOUNTS, []);
                for (let i in response.result) {
                    let service = response.result[i].domain;
                    accounts.push({ "service" : response.result[i]["domain"],
                                    "uname" : response.result[i]["_user"],
                                    "id" : response.result[i][".name"] });
                }
                Application.storage.set(Fonera.ACCOUNTS, accounts);
            }
            Fonera.notify(Fonera.onAccountsUpdates);
        };
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        let url =  this.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        this.callRpcInFonera(rpcCall, callback, url);
    },


    loadEvents : function() {
        Fonera.addEventListener("onCheckFoneraAvailable", Fonera.checkDownloads);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onCheckFoneraAvailable", Fonera.checkDownloads);
    }
};


// FIXME: This code probably doesn't work anymore
//function sendFileToFonera(file) {
//    try {
//
//	// https://developer.mozilla.org/En/Using_XMLHttpRequest
//	let user = getUserPref("username");
//	let password = getUserPref("password");
//
//	// Make a stream from a file.
//	let stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
//	    .createInstance(Components.interfaces.nsIFileInputStream);
//	stream.init(file, 0x04 | 0x08, 0644, 0x04); // file is an nsIFile instance
//
//	// Try to determine the MIME type of the file
//	let mimeType = "text/plain";
//	try {
//	    let mimeService = Components.classes["@mozilla.org/mime;1"]
//		.getService(Components.interfaces.nsIMIMEService);
//	    mimeType = mimeService.getTypeFromFile(file); // file is an nsIFile instance
//	}
//	catch (e) {
//	    // eat it; just use text/plain
//	}
//
//	// Send
//	let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
//	    .createInstance(Components.interfaces.nsIXMLHttpRequest);
//	// TODO: CHANGE!!!!!!!!
//	let url = "http://127.0.0.1:8080/";
//
//	req.open('POST', url, true); /* asynchronous! */
//	// FIXME: doesn't work:
//	//req.onreadystatechange = function (aEvt) {
//	//    try {
//	//	if (req.readyState == 4) {
//	//	    alert ("Transfer completed!");
//	//	}
//	//    } catch (e) {
//	//	// FIXME: remove?
//	//	alert(e);
//	//    }
//	//};
//	req.setRequestHeader('Content-Type', mimeType);
//	req.send(stream);
//
//    }
//    catch (e) {
//	alert(e);
//    }
//}
