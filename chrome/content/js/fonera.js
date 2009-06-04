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

    // discs status:
    DISKS : "disks",
    noDisk : "NODISK", // no disk attached

    FONERATORRENTS : "foneratorrents",
    FONERADOWNLOADS : "foneradownloads",
    // Errors while sending urls:
    LASTERROR : "foneralasterror",
    // Events:
    onCheckFoneraAvailable : [],
    onTorrentsAvailable : [],
    onDownloadsAvailable : [],
    onSendUrl : [],

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

    notify : function(event) {
        for (let i in event) {
            let callback = event[i];
            callback();
        }
    },

    getUserPref : function(preference) {
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        return prefs.getCharPref(preference);
    },

    // url for reaching the fonera.
    foneraURL : function () {
        return "http://" + this.getUserPref("foneraip") + "/luci";
    },

    authenticated : function(authToken) {
        return (authToken != null && authToken != this.authFailed
                && authToken != this.authError);
    },

    checkFoneraAvailable: function() {
        try {
            // do we want to re-authenticate?
            let reAuth = false;
            reAuth = (arguments.length == 1 && arguments[0] == true);
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
                        Fonera.checkDisks();
		    }
		    else {
                        Application.storage.set(Fonera.AUTHTOKEN, Fonera.authError);
                        Application.console.log("Fonera NOT ready\n");
                        Fonera.notify(Fonera.onCheckFoneraAvailable);
		    }
	        }
	    };
	    req.send(null);
        } catch (e) {
            Application.console.log(e);
        }
    },

    authenticate: function(reAuth) {
        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        if (!reAuth && this.authenticated(authToken)) {
            Application.console.log("already authenticated\n");
            this.notify(this.onCheckFoneraAvailable);
            return;
        }

        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);
        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);
        let url =  this.foneraURL() + "/fon_rpc/ff/auth";
        let stream = nJSON.encode({"method": "plain",
            "params" : [this.getUserPref("username"), this.getUserPref("password")] });

        Application.console.log("Authenticating to URL : " + url + "\n");
        Application.console.log("POST : " + stream + "\n");

        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if(req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    if (response.error == null && response.result != null) {
                        Application.storage.set(Fonera.AUTHTOKEN, response.result);
                    } else {
                        Application.storage.set(Fonera.AUTHTOKEN, Fonera.authFailed);
                        Application.console.log("Authentication FAILED\n");
                        Fonera.notify(Fonera.onCheckFoneraAvailable);
                    }
    	        }
            }
        };
        req.send(stream);
    },

    checkDisks : function() {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(this.AUTHTOKEN, null);
        if (!this.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        Application.console.log("sendurl " + authToken + "\n");
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

    sendDownloadUrlToFonera : function(myUrl) {
        let rpcCall = {
            "method" : "downloads_add",
            "params" : [myUrl]
        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);
        let errorStorage = this.LASTERROR;
        let basename = myUrl.replace( /.*\//, "" );

        Application.console.log("My URL : " + myUrl + "\n");
        let callback = function(response) {
            if (!response.result.status) {
                Application.storage.set(errorStorage, basename);
                Application.console.log("Response Error");
            } else {
                Application.storage.set(errorStorage, null);
            }
        };
        this.sendUrlToFonera(rpcCall, callback);
    },

    sendTorrentUrlToFonera : function(myUrl) {
        let basename = myUrl.replace( /.*\//, "" );
        let rpcCall = {
            "method" : "torrent_addurl",
            "params" : [myUrl, basename]
        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);
        let errorStorage = this.LASTERROR;

        let callback = function(response) {
            if (response.error != null) {
                Application.storage.set(errorStorage, basename);
                Application.console.log("Response Error");
            }
            else {
                Application.storage.set(errorStorage, null);
            }
        };
        this.sendUrlToFonera(rpcCall, callback);
    },

    sendUrlToFonera : function (rpcCall, callback) {
        // for some reason I need to declare here Application
        // or else it won't be accesible in the onload function
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        // workaround for this/Fonera wierdness in closures
        let self = this;

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
        let stream = nJSON.encode(rpcCall);

        Application.console.log("Send URL : " + url + "\n");
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
                    callback(response);
                } else {
                    Application.console.log("Http Status Error :" + req.status + "\n");
                }
                // doesn't work:
                // self.notify(self.onSendUrl);
            }
        };
        req.send(stream);
    },

    checkTorrents : function() {
        let rpcCall = {
            "method" : "torrent_list"
        };
        let callback = function (response) {
                let torrents = [];
                if (response.result != null) {
                    let items = response.result.length;
                    for (let i=0; i < items; i++) {
                        try {
                            let theTorrent = response.result[i];
                            let torrentView = [];
                            torrentView["file"] = theTorrent.file;
                            torrentView["status"] = FoneraFormat.stateName(theTorrent.state, 0);

                            if (theTorrent.percent != null && theTorrent.percent != "")
                                torrentView["downloaded"] = theTorrent.percent; // dltotal
                            else
                                torrentView["downloaded"] = "--"; // dltotal
                            //torrentView["uploaded"] = theTorrent.ultotal;
                            torrents.push(torrentView);
                        } catch (e) {
                            Application.console.log("Error parsing torrent: " + e);
                        }
                    }
                    Application.storage.set(Fonera.FONERATORRENTS, torrents);
                    Application.console.log("Updated torrents storage");
                    Fonera.notify(Fonera.onTorrentsAvailable);
                }
        };
        Fonera.checkDownloadsItems(rpcCall, callback);
    },

    checkDownloads : function() {
        let rpcCall = {
            "method" : "downloads_list"
        };

        let callback = function (response) {
                let downloads = [];
                if (response.result != null) {
                    let items = response.result.length;
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
                            if (theDownload.pid != null)
                                downloadView["status"] = FoneraFormat.stateName('active', 'string');
                            else
                                downloadView["status"] = FoneraFormat.stateName(theDownload.status, 'string');
                            if (theDownload.status == "done")
                                downloadView["downloaded"] = "100%";
                            else {
                                let calc = (theDownload.stepsize / theDownload.size) * 100;
                                if (typeof(calc) == "number" && calc.toString() != NaN.toString())
                                    downloadView["downloaded"] = calc.toFixed(2) + "%";
                                else
                                    downloadView["downloaded"] = "--";
                            }
                        } catch (e) {
                            downloadView["downloaded"] = "0.0%";
                        }
                        downloads.push(downloadView);
                    }
                    Application.storage.set(Fonera.FONERADOWNLOADS, downloads);
                    Application.console.log("Updated downloads storage");
                    Fonera.notify(Fonera.onDownloadsAvailable);
                }
        };
        Fonera.checkDownloadsItems(rpcCall, callback);
    },

    /**
     * This function is called from the statusbar windows,
     * therefore we use Fonera. instead of this.
     */
    checkDownloadsItems : function(rpcCall, callback) {
        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        let stream = nJSON.encode(rpcCall);
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);

        Application.console.log("URL : " + url + "\n");
        Application.console.log("POST : " + stream + "\n");
        req.open('POST', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");
        req.onload = callback;
        req.onload = function (aEvt) {
            if ((req.readyState == 4) && (req.status == 200)) {
                Application.console.log("Response :" + req.responseText + "\n");
                let response = nJSON.decode(req.responseText);
                callback(response);
            } else {
                Application.console.log("Error in Http request");
            }
        };
        req.send(stream);
        return;
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
