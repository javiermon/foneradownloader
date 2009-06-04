/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 dlmanager.js : Download Manager for Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraDLManager"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/format.js");

// The Download Manager Window
let FoneraDLManager = {

    drawHeader : function(dialog) {
        let stringsBundle = document.getElementById("string-bundle");
        let dl = document.createElement("richlistitem");
        dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal; background-color:WhiteSmoke");
        let description = document.createElement("description");
        description.setAttribute("value", stringsBundle.getString('file'));

        let type = document.createElement("description");
        type.setAttribute("value", stringsBundle.getString('type'));

        let status = document.createElement("description");
        status.setAttribute("value", stringsBundle.getString('status'));

        let progress = document.createElement("description");
        progress.setAttribute("value", stringsBundle.getString('progress'));

        dl.insertBefore(progress,dl.firstChild);
        dl.insertBefore(status,dl.firstChild);
        dl.insertBefore(type,dl.firstChild);
        dl.insertBefore(description,dl.firstChild);
        dialog.insertBefore(dl, dialog.firstChild);
    },

    drawTorrents : function(dialog) {
        let stringsBundle = document.getElementById("string-bundle");
        let foneraTorrents = Application.storage.get(Fonera.FONERATORRENTS, []);
        //for (let i in foneraTorrents)
        //    Application.console.log("found " + foneraTorrents[i].file);

        if (foneraTorrents != null && foneraTorrents.length != 0) {
            // populate
            for (let i in foneraTorrents) {
                let dl = document.createElement("richlistitem");
                dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal");

                // description:
                // <description>name</description>
                let description = document.createElement("description");
                let dlName = foneraTorrents[i].file;
                description.setAttribute("value", dlName);

                let type = document.createElement("label");
                type.setAttribute("value", stringsBundle.getString('torrent'));

                let status = document.createElement("label");
                let dlStatus = foneraTorrents[i].status;
                status.setAttribute("value",dlStatus);

                //let downloadProgress = document.createElement("label");
                //downloadProgress.setAttribute("value", stringsBundle.getString('progress'));

                let dwSize = document.createElement("label");
                dwSize.setAttribute("value", foneraTorrents[i].downloaded);

                dl.insertBefore(dwSize,dl.firstChild);
                //dl.insertBefore(downloadProgress,dl.firstChild);
                dl.insertBefore(status,dl.firstChild);
                dl.insertBefore(type,dl.firstChild);
                dl.insertBefore(description,dl.firstChild);
                // ...
                dialog.insertBefore(dl, dialog.firstChild);
            }
        }
    },

    drawDownloads : function(dialog) {
        let stringsBundle = document.getElementById("string-bundle");
        let foneraDownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
        //for (let i in foneraDownloads)
        //    Application.console.log("found " + foneraDownloads[i].file);

        if (foneraDownloads != null && foneraDownloads.length != 0) {
            // populate
            for (let i in foneraDownloads) {
                let dl = document.createElement("richlistitem");
                dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal");

                // description:
                // <description>name</description>
                let description = document.createElement("description");
                let dlName = foneraDownloads[i].file;
                description.setAttribute("value", dlName);

                let type = document.createElement("label");
                type.setAttribute("value", stringsBundle.getString('directDownload'));

                let status = document.createElement("label");
                let dlStatus = foneraDownloads[i].status;
                status.setAttribute("value",dlStatus);

                //let downloadProgress = document.createElement("label");
                //downloadProgress.setAttribute("value", stringsBundle.getString('progress'));

                let dwSize = document.createElement("label");
                dwSize.setAttribute("value", foneraDownloads[i].downloaded);

                dl.insertBefore(dwSize,dl.firstChild);
                //dl.insertBefore(downloadProgress,dl.firstChild);
                dl.insertBefore(status,dl.firstChild);
                dl.insertBefore(type,dl.firstChild);
                dl.insertBefore(description,dl.firstChild);
                // ...
                dialog.insertBefore(dl, dialog.firstChild);
            }
        }
    },

    drawItems : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/loading_16.png";

        let dialog = document.getElementById("foneradownloader-downloads-list-items"); // richlistbox-grid-rows
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken)) {
            FoneraDLManager.drawTorrents(dialog);
            FoneraDLManager.drawDownloads(dialog);
        }
        // dialog header last as we're adding in reverse
        FoneraDLManager.drawHeader(dialog);
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/notloading_16.png";
    },

    refreshAction : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/loading_16.png";
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken)) {
            Fonera.checkDisks();
            Fonera.checkTorrents();
            Fonera.checkDownloads();
        } else {
            document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/notloading_16.png";
        }
    },

    showDownloadsWindow : function() {
        // https://developer.mozilla.org/en/Working_with_windows_in_chrome_code
        let name = "chrome://foneradownloader/content/dlmanager.xul";
        let type = "foneradownloader:dlmanager";
        let winMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator);

        // FIXME: there should be a more efficient way of doing this
        // get all windows:
        let enumerator = winMediator.getEnumerator(null);
        while (enumerator.hasMoreElements()) {
            let wmWin = enumerator.getNext();
            if (wmWin.location == name) {
                wmWin.focus();
                return;
            }
        }
        // FIXME: remove this hardcoded settings:
        // ,
        window.open(name, "", "chrome,width=520,height=230,centerscreen,resizable=yes");
        return;
    }
};
