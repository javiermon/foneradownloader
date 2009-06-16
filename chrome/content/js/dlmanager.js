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

    drawDownloads : function(dialog) {
        // FIXME: move styling to css
        // Example: http://www.nexgenmedia.net/mozilla/richlistbox/richlistbox-simple.xul
        let stringsBundle = document.getElementById("string-bundle");
        let foneraDownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
        if (foneraDownloads != null && foneraDownloads.length != 0) {
            // populate
            for (let i in foneraDownloads) {
                let dl = document.createElement("richlistitem");
                dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal; padding: 10px;");
                /*
                 *
                 *  --------------------------------------------------
                 * |       | name              |        | percent     |
                 * | image | ------------------| space  |             |
                 * |       | type    | status  |        | play/cancel |
                 *  --------------------------------------------------
                 *
                 */
                // dl.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal");

                // IMAGE
                let vboxImage = document.createElement("vbox");
                let image = document.createElement("image");
                let extension = foneraDownloads[i].file.substring(foneraDownloads[i].file.lastIndexOf("."),
                                                                  foneraDownloads[i].file.length);
                if (extension != "")
                    image.setAttribute("src","moz-icon://" + extension + "?size=32");
                else
                    image.setAttribute("src","moz-icon://.file?size=32");
                vboxImage.insertBefore(image,vboxImage.firstChild);

                // DATA
                let vboxData = document.createElement("vbox");
                vboxData.setAttribute("style", "text-align: center; min-width: 200px;");
                // name
                let hboxName = document.createElement("hbox");
                hboxName.setAttribute("flex", "1");
                let description = document.createElement("description");
                let dlName = foneraDownloads[i].file;
                description.appendChild(document.createTextNode(dlName));
                description.setAttribute("style", "font-style: bold; font-size: 1.2em; text-align: center;");
                // description.setAttribute("class", "title");
                hboxName.insertBefore(description, hboxName.firstChild);
                // data
                let hboxData = document.createElement("hbox");
                let type = document.createElement("label");
                type.setAttribute("value", stringsBundle.getString('type') + " "
                                  + stringsBundle.getString(foneraDownloads[i].type));
                type.setAttribute("style", "margin-left:15px; font-style: italic; font-size: 0.8em;");
                let status = document.createElement("label");
                status.setAttribute("value", stringsBundle.getString('status') + " "
                                    + FoneraFormat.stateName(foneraDownloads[i].status));
                status.setAttribute("style", "margin-left:15px; font-style: italic; font-size: 0.8em;");
                hboxData.insertBefore(status, hboxData.firstChild);
                hboxData.insertBefore(type, hboxData.firstChild);

                vboxData.insertBefore(hboxData,vboxData.firstChild);
                vboxData.insertBefore(hboxName,vboxData.firstChild);

                let space = document.createElement("spacer");
                space.setAttribute("flex","1");

                let vboxPercent = document.createElement("vbox");
                // chrome://mozapps/skin/downloads/downloadButtons.png
                // http://hg.mozilla.org/mozilla-central/file/eac99a38d8d9/toolkit/themes/winstripe/mozapps/downloads/downloads.css
                let hboxButtons = document.createElement("hbox");
                // hboxButtons.setAttribute("style", "text-align: center;");
                let playb = document.createElement("image");
                let action = "none";

                if (foneraDownloads[i].status != "load") {
                    action = "start";
                    playb.setAttribute("style",
                                   "list-style-image: url('chrome://mozapps/skin/downloads/downloadButtons.png'); "
                                   + "-moz-image-region: rect(32px, 16px, 48px, 0px);");
                } else if (foneraDownloads[i].status == "done") {
                    playb.setAttribute("style","");
                } else{
                    action = "pause";
                    playb.setAttribute("style",
                                   "list-style-image: url('chrome://mozapps/skin/downloads/downloadButtons.png'); "
                                   + "-moz-image-region: rect(0px, 48px, 16px, 32px);");

                }
                playb.setAttribute("onclick","FoneraDLManager.downloadAction('" + foneraDownloads[i].id + "','" + action  + "')");

                let cancelb = document.createElement("image");
                cancelb.setAttribute("style",
                                   "list-style-image: url('chrome://mozapps/skin/downloads/downloadButtons.png'); "
                                     + "-moz-image-region: rect(0px, 32px, 16px, 16px);");

                cancelb.setAttribute("onclick","FoneraDLManager.downloadAction('" + foneraDownloads[i].id + "','delete')");

                let spaceb = document.createElement("spacer");
                spaceb.setAttribute("flex","1");

                hboxButtons.insertBefore(cancelb, hboxButtons.firstChild);
                hboxButtons.insertBefore(playb, hboxButtons.firstChild);
                hboxButtons.insertBefore(spaceb, hboxButtons.firstChild);

                vboxPercent.insertBefore(hboxButtons,vboxPercent.firstChild);

                let dwSize = document.createElement("label");
                dwSize.setAttribute("value", foneraDownloads[i].downloaded);
                dwSize.setAttribute("style", "font-style: bold; font-size: 1.6em;"
                    + " text-align: center;");

                vboxPercent.insertBefore(dwSize,vboxPercent.firstChild);

                dl.insertBefore(vboxPercent,dl.firstChild);
                dl.insertBefore(space,dl.firstChild);
                dl.insertBefore(vboxData,dl.firstChild);
                dl.insertBefore(vboxImage,dl.firstChild);

                // ...
                dialog.insertBefore(dl, dialog.firstChild);
            }
        }
    },

    downloadAction : function(id, action) {
        // FIXME: we trigger refresh action so the throbbler spins and gives some UI feedback
        Application.console.log("action :" + action + " called on " + id);
        switch(action) {
        case "pause":
            Fonera.pauseDownloadById(id);
            FoneraDLManager.refreshAction();
            break;
        case "delete":
            Fonera.deleteDownloadById(id);
            FoneraDLManager.refreshAction();
            break;
        case "start":
            Fonera.startDownloadById(id);
            FoneraDLManager.refreshAction();
            break;
        case "none":
        default:
            break;
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

    clearCompleted : function() {
        Fonera.deleteCompletedDownloads();
        FoneraDLManager.refreshAction();
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
