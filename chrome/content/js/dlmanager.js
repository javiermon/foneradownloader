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

    drawDownloads : function(dialog) {
        let stringsBundle = document.getElementById("string-bundle");
        let foneraDownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
        if (foneraDownloads != null && foneraDownloads.length != 0) {
            // populate
            for (let i in foneraDownloads) {
                let dl = document.createElement("richlistitem");
                dl.setAttribute("style", "padding: 10px;");
                /*
                 *
                 * ---------------------------------------
                 *        | name              |  |
                 *  image | ------------------|  | percent
                 *        | type    | status  |  |
                 * ---------------------------------------

                 */
                // dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal");

                // IMAGE
                let vboxImage = document.createElement("vbox");
                let image = document.createElement("image");
                let extension = foneraDownloads[i].file.substring(foneraDownloads[i].file.lastIndexOf("."), foneraDownloads[i].file.length);
                image.setAttribute("src","moz-icon://" + extension + "?size=32");
                vboxImage.insertBefore(image,vboxImage.firstChild);

                // DATA
                let hboxName = document.createElement("hbox");
                hboxName.setAttribute("flex", "1");

                // description:
                // <description>name</description>
                let description = document.createElement("description");
                let dlName = foneraDownloads[i].file;
                description.setAttribute("value", dlName);
                hboxName.insertBefore(description, hboxName.firstChild);

                let hboxData = document.createElement("hbox");
                let type = document.createElement("label");
                type.setAttribute("value", stringsBundle.getString('type') + ":" + stringsBundle.getString(foneraDownloads[i].type));

                let status = document.createElement("label");
                status.setAttribute("value", stringsBundle.getString('status') + ":" + foneraDownloads[i].status);
                hboxData.insertBefore(status, hboxData.firstChild);
                hboxData.insertBefore(type, hboxData.firstChild);

                let vboxPercent = document.createElement("hbox");
                let dwSize = document.createElement("label");
                dwSize.setAttribute("value", foneraDownloads[i].downloaded);

                vboxPercent.insertBefore(dwSize,vboxPercent.firstChild);
                //vboxPercent.insertBefore(downloadProgress,vboxPercent.firstChild);
                vboxPercent.insertBefore(status,vboxPercent.firstChild);
                vboxPercent.insertBefore(type,vboxPercent.firstChild);
                vboxPercent.insertBefore(description,vboxPercent.firstChild);

                dl.insertBefore(vboxPercent,dl.firstChild);
                dl.insertBefore(hboxName,dl.firstChild);
                dl.insertBefore(vboxImage,dl.firstChild);

                // ...
                dialog.insertBefore(dl, dialog.firstChild);
            }
        }
    },

    drawItems : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/loading_16.png";

        // let dialog = document.getElementById("foneradownloader-downloads-list-items"); // richlistbox-grid-rows
        let dialog = document.getElementById("foneradownloader-downloads-list"); // richlistbox
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken)) {
            FoneraDLManager.drawDownloads(dialog);
        }
        // dialog header last as we're adding in reverse
        // FoneraDLManager.drawHeader(dialog);
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/notloading_16.png";
    },

    refreshAction : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/loading_16.png";
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken)) {
            Fonera.checkDisks();
            Fonera.checkDownloads();
        } else {
            document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/notloading_16.png";
        }
    },

    showDownloadsWindow : function() {
        if (!Fonera.isPluginEnabled())
            return;

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
    },

    processClick : function(event) {
        if (!Fonera.isPluginEnabled())
            return;

        let button = event.button; // 0: left 1: middle 2: right

        if (button == 2) {
            // rightclick -> show option to disable plugin
        } else if (button == 0)
            FoneraDLManager.showDownloadsWindow();
    },

    loadEvents : function() {
        Fonera.addEventListener("onDownloadsAvailable", FoneraDLManager.drawItems);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onDownloadsAvailable", FoneraDLManager.drawItems);
    }
};
