/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 downloader.js : Fonera Javascript helper
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



let EXPORTED_SYMBOLS = ["FoneraDownloader"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

let Preferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);

Components.utils.import("resource://modules/format.js");
Components.utils.import("resource://modules/fonera.js");

let FoneraDownloader = {

    // Transmission data:
    TRANSSESSION : "X-Transmission-Session-Id",

    // Events:
    onDownloadsAvailable : [],
    onAccountsUpdates : [],
    onSendUrl : [],

    // storage:
    FONERADOWNLOADS : "foneradownloads",
    FONERATORRENTS : "foneratorrents",

    // Accounts:
    ACCOUNTS : "ACCOUNTS",
    ACCOUNTERROR : "account-error",
    ACCOUNTDELERROR : "account-delete-error",
    NOACCOUNTERROR : "no-account-for-link",
    DOMAINS : "megaupload|rapidshare",

    // http://snippets.dzone.com/posts/show/452
    urlRegexp : /http:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/,

    addEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            FoneraDownloader[event].push(callback);
        } catch (e) {
            Application.console.log("invalid registration for event "
                                    + event + ": " + callback + ": " + e);
        }
    },

    removeEventListener : function(event, callback) {
        try {
            // example: event == onCheckFoneraAvailable
            let eventCallbacks = FoneraDownloader[event];
            for (let i in eventCallbacks)
                if (callback == eventCallbacks[i])
                    // remove from index i, 1 element
                    eventCallbacks.splice(i,1);
        } catch (e) {
            Application.console.log("invalid registration for event "
                                    + event + ": " + callback + ": " + e);
        }
    },

    notify : function(aEvent) {
        for (let i in aEvent) {
            let aCallback = aEvent[i];
            aCallback();
        }
    },

    transmissionUrl : function () {
        let ip = Fonera.getUserPref("foneraip").split(":")[0];

        let transCredentials = Fonera.getUsername()
            + ":" + Fonera.getUserPref("password") + "@";
        let url = "http://" + transCredentials + ip
            + ":9091/transmission/rpc";
        return url;
    },

    authenticateInTransmission : function () {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        let url = FoneraDownloader.transmissionUrl();
        // https://developer.mozilla.org/En/Using_XMLHttpRequest
        // https://developer.mozilla.org/en/nsIJSON
        let nJSON = Components.classes["@mozilla.org/dom/json;1"]
            .createInstance(Components.interfaces.nsIJSON);

        // Send
        let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);

        Application.console.log("Authenticating to URL : " + url + "\n");
        req.mozBackgroundRequest = true;
        req.open('GET', url, true); /* asynchronous! */
        req.channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        req.setRequestHeader('Content-Type', "application/json");

        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 409) {
                    let session = req.getResponseHeader(FoneraDownloader.TRANSSESSION);
                    Application.console.log(FoneraDownloader.TRANSSESSION + " : " +  session);
                    Application.storage.set(FoneraDownloader.TRANSSESSION, session);
                }
            }
            // FoneraDownloader.notify(Fonera.onCheckFoneraAvailable);
        };
        req.send(null);
    },

    getDownloadById: function(id) {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let downloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
        downloads = downloads.concat(torrents);

        let download = null;
        for (let i in downloads) {
            if (downloads[i].id == id) {
                download = downloads[i];
                return download;
            }
        }
        return download;
    },

    pauseDownloadById : function(id) {
        let rpcCall = null; let callback = null;
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let url = null;
        let download  = FoneraDownloader.getDownloadById(id);

        if (download == null) {
            Application.console.log("Download id not found: " + id);
            return;
        }

        if (download.type == "torrent") {
            id = parseInt(id);
            rpcCall = {
                "method":"torrent-stop",
                "arguments": { "ids":[id] }
            };
            callback = function(response) {
                if (response.result == "success")
                    FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
                else {
                    let errorMsg = id + ":" + response.result.replace(/\s/g,'');
                    Application.console.log("Response Error: " + errorMsg);
                    Application.storage.set(Fonera.LASTERROR, errorMsg);
                }
            };
            url = FoneraDownloader.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_pause",
                "params" : [id]
            };
            let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
            url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error: " + response.error);
                    Application.storage.set(Fonera.LASTERROR, id + ":" + response.error);
                }
                FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
            };
        }
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    startDownloadById : function(id) {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let url = null;
        let rpcCall = null; let callback = null;
        let download  = FoneraDownloader.getDownloadById(id);

        if (download == null) {
            Application.console.log("Download id not found: " + id);
            return;
        }

        if (download.type == "torrent") {
            id = parseInt(id);
            callback = function(response) {
                if (response.result == "success")
                    FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
                else {
                    let errorMsg = id + ":" + response.result.replace(/\s/g,'');
                    Application.console.log("Response Error: " + errorMsg);
                    Application.storage.set(Fonera.LASTERROR, errorMsg);
                }
            };
            rpcCall = {
                "method":"torrent-start",
                "arguments":{ "ids":[id] }
                };
            url = FoneraDownloader.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_start",
                "params" : [id]
            };
            let Application = Components.classes["@mozilla.org/fuel/application;1"]
                .getService(Components.interfaces.fuelIApplication);

            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error: " + response.error);
                    Application.storage.set(Fonera.LASTERROR, id + ":" + response.error);
                }
                FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
            };
            let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
            url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        }
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    deleteCompletedDownloads : function() {
        FoneraDownloader.deleteByStatus("done");
    },

    deleteErroneousDownloads : function() {
        FoneraDownloader.deleteByStatus("error");
    },

    deleteByStatus : function(status) {
        // we do the same call as in deleteDownloadById, but
        // call the nofity at the end, not on every call
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let downloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
        downloads = downloads.concat(torrents);

        for (let i in downloads) {
            if (downloads[i].status == status) {
                let rpcCall = null; let callback = null;
                let url = null; let id = downloads[i].id;

                if (downloads[i].type == "torrent") {
                    id = parseInt(downloads[i].id);
                    rpcCall = {
                        "method" : "torrent-remove",
                        "arguments": { "ids": [id] }
                    };

                    callback = function(response) {
                        if (response.result == "success")
                            FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
                        else {
                            let errorMsg = id + ":" + response.result.replace(/\s/g,'');
                            Application.console.log("Response Error: " + errorMsg);
                            Application.storage.set(Fonera.LASTERROR, errorMsg);
                        }
                    };
                    url = FoneraDownloader.transmissionUrl();
                } else {
                    let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
                    url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
                    rpcCall = {
                        "method" : "dl_delete",
                        "params" : [id]
                    };

                    callback = function(response) {
                        if (response.error != null) {
                            Application.console.log("Response Error: " + response.error);
                            Application.storage.set(Fonera.LASTERROR, id + ":" + response.error);
                        }
                    };
                }
                FoneraDownloader.callRpc(rpcCall, callback, url);
            }
        }
        FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
    },

    deleteDownloadById : function(id) {
        let rpcCall = null;
        let callback = null; let url = null;

        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let download  = FoneraDownloader.getDownloadById(id);

        if (download == null) {
            Application.console.log("Download id not found: " + id);
            return;
        }

        if (download.type == "torrent") {
            id = parseInt(id);
            callback = function(response) {
                if (response.result == "success")
                    FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
                else {
                    let errorMsg = id + ":" + response.result.replace(/\s/g,'');
                    Application.console.log("Response Error: " + errorMsg);
                    Application.storage.set(Fonera.LASTERROR, errorMsg);
                }
            };
            rpcCall = {
                "method":"torrent-remove",
                "arguments": { "ids": [id] }
            };
            url = FoneraDownloader.transmissionUrl();
        } else {
            rpcCall = {
                "method" : "dl_delete",
                "params" : [id]
            };

            callback = function(response) {
                if (response.error != null) {
                    Application.console.log("Response Error: " + response.error);
                    Application.storage.set(Fonera.LASTERROR, id + ":" + response.error);
                }
                FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
            };
            let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
            url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        }
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    urlHandlerParser : function(myUrl) {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);
        let errorStorage = Fonera.LASTERROR;
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
                Application.storage.set(errorStorage, FoneraDownloader.NOACCOUNTERROR + ":" + domain);
                FoneraDownloader.notify(FoneraDownloader.onSendUrl);
                return null;
            }
        }
        return myUrl;
    },

    sendDownloadUrlToFonera : function(myUrl) {
        if (myUrl.replace( /.*\//, "" ).lastIndexOf(".torrent") != -1) {
            this.sendTorrentToFonera(myUrl);
        } else {
            this.sendDownloadToFonera(myUrl);
        }
    },

    /**
     * Private: use sendDownloadUrlToFonera instead
     */
    sendDownloadToFonera : function(myUrl) {
        let rpcCall = {
            "method" : "downloads_add",
            "params" : [myUrl]
        };
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);
        let errorStorage = Fonera.LASTERROR;
        let basename = myUrl.replace( /.*\//, "" );

        // let the url handler parser check if we can download
        // and/or prepare the download link
        myUrl = this.urlHandlerParser(myUrl);
        if (myUrl == null) {
            return;
        }

        Application.console.log("My URL : " + myUrl + "\n");
        let callback = function(response) {
            if (!response.result.status) {
                if (response.error != null) {
                    Application.console.log("Response Error: " + response.error);
                    Application.storage.set(Fonera.LASTERROR, basename + ":" + response.error);
                } else {
                    Application.storage.set(Fonera.LASTERROR, basename + ":unknownerror");
                    Application.console.log("Response Error: unknown error");
                }
            }
            FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
            FoneraDownloader.notify(FoneraDownloader.onSendUrl);
        };
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    /**
     * Private: use sendDownloadUrlToFonera istead
     */
    sendTorrentToFonera : function(myUrl) {
        // get basename and strip the .torrent in the end as the fonera will add it eventually
        let basename = myUrl.replace( /.*\//, "" ).replace( ".torrent", "" );
        let rpcCall = {
            "method" : "torrent-add",
            "arguments" : {"filename" : myUrl}
        };

        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let callback = function(response) {
            if (response.result != "success") {
                let errorMsg = basename + ":" + response.result.replace(/\s/g,'');
                Application.storage.set(Fonera.LASTERROR, errorMsg);
                Application.console.log("Response Error: " + errorMsg);
            }
            FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
            FoneraDownloader.notify(FoneraDownloader.onSendUrl);
        };
        let url = FoneraDownloader.transmissionUrl();
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    callRpc : function (rpcCall, callback, url) {
        // for some reason I need to declare here Application
        // or else it won't be accesible in the onload function
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken) || !Fonera.hasDisk()) {
            Fonera.notify(Fonera.onCheckFoneraAvailable);
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
        // req.setRequestHeader('Content-Type', "application/json");

        if (FoneraDownloader.transmissionUrl() == url) {
            let session = Application.storage.get(FoneraDownloader.TRANSSESSION, null);
            if (session != null)
                req.setRequestHeader(FoneraDownloader.TRANSSESSION, session);
            else {
                Application.console.log("No " + FoneraDownloader.TRANSSESSION + " found!");
                return;
            }
        }

	let thisself = this;
        req.onload = function (aEvt) {
            if (req.readyState == 4) {
                Application.console.log("Response :" + req.responseText + "\n");
    	        if (req.status == 200) {
                    let response = nJSON.decode(req.responseText);
                    callback(response);
                } else if (req.status == 409) {
                    Application.console.log("Transmission session expired! Reauthenticating...");
                    let session = req.getResponseHeader(FoneraDownloader.TRANSSESSION);
                    Application.console.log(FoneraDownloader.TRANSSESSION + " : " +  session);
                    Application.storage.set(FoneraDownloader.TRANSSESSION, session);
                    Application.console.log("Restarting call...");
                    thisself.callRpc(rpcCall, callback, url);
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
                        "arguments": { "fields": ["id", "name" ,"status","totalSize", "leftUntilDone",
                                                  "rateDownload","rateUpload","peersConnected","peersGettingFromUs","peersSendingToUs"] }
                      };

        let callback = function (response) {
                if (response.result != null) {
                    Application.storage.set(FoneraDownloader.FONERATORRENTS, []);
                    let items = response.arguments.torrents.length;
                    let downloads = [];
                    for (let i=0; i < items; i++) {
                        let theDownload = response.arguments.torrents[i];
                        let downloadView = [];
                        downloadView["file"] = theDownload.name;
                        // FIXME: get status:
                        // 8 -> seeding | 4 -> downloading | 16 -> paused
                        downloadView["status"] = FoneraFormat.transmissionToHumanStateName(theDownload.status);
                        downloadView["type"] = "torrent";
                        downloadView["size"] = theDownload.totalSize;
                        downloadView["id"] = theDownload.id;
                        let whatsdone = ((theDownload.totalSize - theDownload.leftUntilDone)/theDownload.totalSize)*100;
                        whatsdone = whatsdone.toFixed(2);
                        // workaround no need for a 100.00 in the UI.
                        if (whatsdone.toString() == "100.00")
                            whatsdone = 100;
                        downloadView["downloaded"] = whatsdone + "%";
                        // TODO: translate:
                        downloadView["moreinfo"] = { "rate" : "DL: " + FoneraFormat.bytesToSize(theDownload.rateDownload, 2) + "/s " + "UL: " +
                                                     FoneraFormat.bytesToSize(theDownload.rateUpload, 2) + "/s",
                                                     "peers" : "Peers - " + "DL: " + theDownload.peersSendingToUs +
                                                     " UL: " + theDownload.peersGettingFromUs + " (Connected: " + theDownload.peersConnected + ")"
                                                   };
                        downloads.push(downloadView);
                    }

                    Application.storage.set(FoneraDownloader.FONERATORRENTS, downloads);
                    Application.console.log("Updated downloads storage");
                }
            // we do the callback on the other rpc response
            //FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
        };
        let url = FoneraDownloader.transmissionUrl();
        FoneraDownloader.callRpc(rpcCall, callback, url);
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
                    Application.storage.set(FoneraDownloader.FONERADOWNLOADS, []);
                    let items = response.result.length;
                    let downloads = [];
                    for (let i=0; i < items; i++) {
                        let theDownload = response.result[i];
                        let downloadView = [];
                        // basename:
                        try {
                            downloadView["file"] = theDownload.file.replace( /.*\//, "" );
                        } catch (e) {
                            downloadView["file"] = theDownload.uri.replace( /.*\//, "" );
                        }
                        downloadView["status"] = FoneraFormat.foneraToHumanStateName(theDownload.status);
                        downloadView["type"] = theDownload.type;
                        downloadView["size"] = theDownload.size;
                        downloadView["id"] = theDownload.id;
                        // workaround for luci rpc bug
                        if (theDownload.status == "done")
                            downloadView["downloaded"] = "100%";
                        else
                            downloadView["downloaded"] = theDownload.percent;
                        downloadView["moreinfo"] = null;
                        downloads.push(downloadView);
                    }

                    Application.storage.set(FoneraDownloader.FONERADOWNLOADS, downloads);
                    Application.console.log("Updated downloads storage");

                }
            FoneraDownloader.notify(FoneraDownloader.onDownloadsAvailable);
        };
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    checkDownloads : function() {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        Application.console.log("Checking torrents");
        FoneraDownloader.checkTorrentsItems();

        Application.console.log("Checking downloads");
        FoneraDownloader.checkDownloadsItems();

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
                Application.console.log("Response Error. Setting " + Fonera.LASTERROR + " to " + FoneraDownloader.ACCOUNTERROR);
                Application.storage.set(FoneraDownloader.ACCOUNTERROR, FoneraDownloader.ACCOUNTERROR);
            }
            // refresh accounts storage
            FoneraDownloader.checkAccountsSettings();
        };
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        FoneraDownloader.callRpc(rpcCall, callback, url);
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
                Application.console.log("Response Error. Setting " + Fonera.LASTERROR + " to " + FoneraDownloader.ACCOUNTDELERROR);
                Application.storage.set(FoneraDownloader.ACCOUNTERROR, FoneraDownloader.ACCOUNTDELERROR);
            }
            // refresh accounts storage
            FoneraDownloader.checkAccountsSettings();
        };
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    checkAccountsSettings : function() {
        let Application = Components.classes["@mozilla.org/fuel/application;1"]
            .getService(Components.interfaces.fuelIApplication);

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (!Fonera.authenticated(authToken)) {
            Application.console.log("Not authenticated\n");
            return;
        }

        let rpcCall = {
            "method" : "downloads_listcookies"
        };

        let callback = function(response) {
            if (response.error != null) {
                Application.console.log("Response Error: " + response.error);
            } else {
                let accounts = [];
                for (let i in response.result) {
                    let service = response.result[i].domain;
                    accounts.push({ "service" : response.result[i]["domain"],
                                    "uname" : response.result[i]["_user"],
                                    "id" : response.result[i][".name"] });
                }
                Application.storage.set(FoneraDownloader.ACCOUNTS, accounts);
            }
            FoneraDownloader.notify(FoneraDownloader.onAccountsUpdates);
        };

        let url =  Fonera.foneraURL() + "/fon_rpc/ff?auth=" + authToken;
        FoneraDownloader.callRpc(rpcCall, callback, url);
    },

    getErrorString : function(errors, stringsBundle) {
        let formatSeparator = " : ";
        let separator = ":";
        Application.console.log("Found error: " + errors);
        if (errors.match(FoneraDownloader.NOACCOUNTERROR)) {
            let error = errors.split(separator)[0];
            let domain = errors.split(separator)[1];
            return stringsBundle.getString(error) + formatSeparator + domain;
        } else if (errors == FoneraDownloader.ACCOUNTERROR) {
            return stringsBundle.getString(errors);
        } else {
            try {
                // see if its translated
                let downloaditem = errors.split(separator)[0];
                let errormsg = errors.split(separator)[1];
                try {
                    return downloaditem + formatSeparator + stringsBundle.getString(errormsg);
                } catch (e) {
                    return downloaditem + formatSeparator + stringsBundle.getString('downloadFailed');
                }
            } catch (e) {
                Application.console.log("Error parsing error string: "
                                        + errors + formatSeparator + e);
            }
            // generic error
            return errors + formatSeparator + stringsBundle.getString('unknownerror');
        }
    },

    loadEvents : function() {
        Fonera.addEventListener("onCheckDisks", FoneraDownloader.checkDownloads);
        Fonera.addEventListener("onCheckDisks",
                                FoneraDownloader.authenticateInTransmission);
        Fonera.addEventListener("onCheckDisks",
                                FoneraDownloader.checkAccountsSettings);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onCheckDisks", FoneraDownloader.checkDownloads);
        Fonera.removeEventListener("onCheckDisks",
                                FoneraDownloader.authenticateInTransmission);
        Fonera.removeEventListener("onCheckDisks",
                                FoneraDownloader.checkAccountsSettings);
    }
};
