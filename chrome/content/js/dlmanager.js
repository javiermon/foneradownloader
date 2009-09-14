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
Components.utils.import("resource://modules/downloader.js");
Components.utils.import("resource://modules/format.js");

// The Download Manager Window
let FoneraDLManager = {

    drawDownloadItem : function(downloadItem, dl, stringsBundle) {
        /*
         *
         *  --------------------------------------------------
         * |       | name              |        | percent     |
         * | image | ------------------| space  |             |
         * |       | type    | status  |        | play/cancel |
         *  --------------------------------------------------
         *
         *
         */
        // IMAGE
        let vboxImage = document.createElement("vbox");
        let image = document.createElement("image");
        let extension = downloadItem.file.substring(downloadItem.file.lastIndexOf("."),
                                                          downloadItem.file.length);

        let icon = (extension != "") ? "moz-icon://" + extension + "?size=32" : "moz-icon://.file?size=32";
        image.setAttribute("src",icon);

        let dlName = downloadItem.file;

        // TOOLTIP
        let tooltip = document.createElement("tooltip");
        let tooltipName = document.createElement("description");
        tooltipName.setAttribute("value", dlName);
        tooltip.appendChild(tooltipName);

        let dlMore = downloadItem.moreinfo;
        for (let x in dlMore) {
            let tooltipMore = document.createElement("description");
            tooltipMore.setAttribute("value", dlMore[x]);
            tooltip.appendChild(tooltipMore);
        }

        let tooltipId = dlName + "id";
        tooltip.setAttribute("id", tooltipId);
        vboxImage.insertBefore(image,vboxImage.firstChild);

        image.setAttribute("tooltip", tooltipId);
        vboxImage.insertBefore(tooltip,vboxImage.firstChild);

        // DATA
        let vboxData = document.createElement("vbox");
        vboxData.setAttribute("style", "text-align: center; min-width: 200px;");
        // name
        let hboxName = document.createElement("hbox");
        hboxName.setAttribute("flex", "1");
        let description = document.createElement("description");

        description.appendChild(document.createTextNode(dlName));
        description.setAttribute("style", "font-style: bold; font-size: 1.2em; text-align: center;");
        hboxName.insertBefore(description, hboxName.firstChild);
        // data
        let hboxData = document.createElement("hbox");
        hboxData.setAttribute("style","display:-moz-grid-line; -moz-box-orient:horizontal");
        let type = document.createElement("label");
        type.setAttribute("value", stringsBundle.getString('type'));
        type.setAttribute("style", "margin-left:15px; font-style: italic; font-size: 0.9em;");

        let typeString = document.createElement("label");
        typeString.setAttribute("value", stringsBundle.getString(downloadItem.type));
        typeString.setAttribute("style", "font-size: 0.9em;");

        let status = document.createElement("label");
        status.setAttribute("value", stringsBundle.getString('status'));
        status.setAttribute("style", "margin-left:15px; font-style: italic; font-size: 0.9em;");

        let statusString = document.createElement("label");
        statusString.setAttribute("value", FoneraFormat.stateName(downloadItem.status));
        statusString.setAttribute("style", "font-size: 0.9em; "
                                  + "color: " + FoneraFormat.colorPicker(downloadItem.status) + ";");

        let size = document.createElement("label");
        size.setAttribute("value", stringsBundle.getString('size'));
        size.setAttribute("style", "margin-left:15px; font-style: italic; font-size: 0.9em;");

        let sizeString = document.createElement("label");
        sizeString.setAttribute("value", FoneraFormat.bytesToSize(downloadItem.size, 2));
        sizeString.setAttribute("style", "font-size: 0.9em;");

        hboxData.insertBefore(sizeString, hboxData.firstChild);
        hboxData.insertBefore(size, hboxData.firstChild);
        hboxData.insertBefore(statusString, hboxData.firstChild);
        hboxData.insertBefore(status, hboxData.firstChild);
        hboxData.insertBefore(typeString, hboxData.firstChild);
        hboxData.insertBefore(type, hboxData.firstChild);

        vboxData.insertBefore(hboxData,vboxData.firstChild);
        vboxData.insertBefore(hboxName,vboxData.firstChild);

        let space = document.createElement("spacer");
        space.setAttribute("flex","1");

        let vboxPercent = document.createElement("vbox");
        let hboxButtons = document.createElement("hbox");
        let playb = document.createElement("image");
        let action = "none";

        if (downloadItem.status == "done" || downloadItem.status == "hashing") {
            playb.setAttribute("style","");
        } else if (downloadItem.status == "load") {
            action = "pause";
            playb.setAttribute("style",
                           "list-style-image: url('chrome://foneradownloader/skin/downloadButtons.png'); "
                           + "-moz-image-region: rect(0px, 48px, 16px, 32px);");
            playb.tooltipText = stringsBundle.getString("pause");
        } else {
            action = "start";
            playb.setAttribute("style",
                           "list-style-image: url('chrome://foneradownloader/skin/downloadButtons.png'); "
                           + "-moz-image-region: rect(32px, 16px, 48px, 0px);");
            playb.tooltipText = stringsBundle.getString("start");
        }
        playb.setAttribute("onclick","FoneraDLManager.downloadAction('" + downloadItem.id + "','" + action  + "')");

        let cancelb = document.createElement("image");
        cancelb.setAttribute("style",
                           "list-style-image: url('chrome://foneradownloader/skin/downloadButtons.png'); "
                             + "-moz-image-region: rect(0px, 32px, 16px, 16px);");

        cancelb.setAttribute("onclick","FoneraDLManager.downloadAction('" + downloadItem.id + "','delete')");
        cancelb.tooltipText = stringsBundle.getString("cancel");

        let spaceb = document.createElement("spacer");
        spaceb.setAttribute("flex","1");

        hboxButtons.insertBefore(cancelb, hboxButtons.firstChild);
        hboxButtons.insertBefore(playb, hboxButtons.firstChild);
        hboxButtons.insertBefore(spaceb, hboxButtons.firstChild);

        vboxPercent.insertBefore(hboxButtons,vboxPercent.firstChild);

        let dwSize = document.createElement("label");
        dwSize.setAttribute("value", downloadItem.downloaded);
        dwSize.setAttribute("style", "font-style: bold; font-size: 1.6em;"
            + " text-align: center;");

        vboxPercent.insertBefore(dwSize,vboxPercent.firstChild);

        dl.insertBefore(vboxPercent,dl.firstChild);
        dl.insertBefore(space,dl.firstChild);
        dl.insertBefore(vboxData,dl.firstChild);
        dl.insertBefore(vboxImage,dl.firstChild);
    },

    checkStatus : function() {
        FoneraDLManager.startThrobbler();
        let stringsBundle = document.getElementById("string-bundle");
        let text = stringsBundle.getString('loading') + "...";
        let icon = "chrome://global/skin/icons/loading_16.png";

        if (!Fonera.isPluginEnabled()) {
            text = stringsBundle.getString('disabledString');
            icon = "chrome://foneradownloader/skin/disabled.png";
            FoneraDLManager.stopThrobbler();
        } else {
            let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
            if (authToken == Fonera.authFailed) {
                text = stringsBundle.getString('authFailString');
                icon = "chrome://global/skin/icons/Warning.png";
                FoneraDLManager.stopThrobbler();
            } else if (authToken == Fonera.authError) {
                text = stringsBundle.getString('authErrorString');
                icon = "chrome://global/skin/icons/Error.png";
                FoneraDLManager.stopThrobbler();
            } else if (authToken != null ) {
                Application.console.log("authenticated");
                // check disks:
                if (!Fonera.hasDisk()) {
                    Application.console.log("no disk available");
                    text = stringsBundle.getString('noDiskErrorString');
                    icon = "chrome://global/skin/icons/Warning.png";
                    FoneraDLManager.stopThrobbler();
                }
            } else {
                Application.console.log("not authenticated");
            }
        }

        let dialog = document.getElementById("foneradownloader-downloads-list"); // richlistbox
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }
        let ritem = document.createElement("richlistitem");
        FoneraDLManager.drawStatusItem(ritem, icon, text);
        dialog.insertBefore(ritem, dialog.firstChild);
        FoneraDLManager.stripeifyList(dialog);
    },

    drawStatusItem : function(dl, icon, dlName) {
        // IMAGE
        let vboxImage = document.createElement("vbox");
        let image = document.createElement("image");
        image.setAttribute("src",icon);
        vboxImage.insertBefore(image,vboxImage.firstChild);

        // name
        let hboxName = document.createElement("hbox");
        hboxName.setAttribute("flex", "1");
        hboxName.setAttribute("style", "text-align: center; min-width: 200px;");
        let description = document.createElement("description");

        description.appendChild(document.createTextNode(dlName));
        description.setAttribute("style", "font-style: bold; font-size: 1.2em; text-align: center;");
        let space = document.createElement("spacer");
        hboxName.insertBefore(space, hboxName.firstChild);
        hboxName.insertBefore(description, hboxName.firstChild);

        // space.setAttribute("flex","1");

        //dl.insertBefore(space,dl.firstChild);
        dl.insertBefore(hboxName,dl.firstChild);
        dl.insertBefore(vboxImage,dl.firstChild);
    },

    drawDownloads : function(dialog) {
        // FIXME: move styling to css
        // Example: http://www.nexgenmedia.net/mozilla/richlistbox/richlistbox-simple.xul
        let stringsBundle = document.getElementById("string-bundle");
        let foneraDownloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
        foneraDownloads = foneraDownloads.concat(torrents);

        if (foneraDownloads != null && foneraDownloads.length != 0) {
            // populate
            for (let i in foneraDownloads) {
                let dl = document.createElement("richlistitem");
                FoneraDLManager.drawDownloadItem(foneraDownloads[i], dl, stringsBundle);
                // ...
                dialog.insertBefore(dl, dialog.firstChild);
            }
            // enable clear downloads
            document.getElementById("clearButton").disabled = false;
        } else {
            // disable clear downloads
            document.getElementById("clearButton").disabled = true;
        }
    },

    downloadAction : function(id, action) {
        // FIXME: we trigger refresh action so the throbbler spins and gives some UI feedback
        Application.console.log("action :" + action + " called on " + id);
        switch(action) {
        case "pause":
            FoneraDLManager.startThrobbler();
            FoneraDownloader.pauseDownloadById(id);
            // Force UI update:
            FoneraDLManager.refreshAction();
            break;
        case "delete":
            FoneraDLManager.startThrobbler();
            FoneraDownloader.deleteDownloadById(id);
            // Force UI update:
            FoneraDLManager.refreshAction();
            break;
        case "start":
            FoneraDLManager.startThrobbler();
            FoneraDownloader.startDownloadById(id);
            // Force UI update:
            FoneraDLManager.refreshAction();
            break;
        case "none":
        default:
            break;
        }
    },

    startThrobbler : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/loading_16.png";
    },

    stopThrobbler : function() {
        document.getElementById("foneradownloader-dlmicon").src = "chrome://global/skin/icons/notloading_16.png";
    },

    drawItems : function() {
        let dialog = document.getElementById("foneradownloader-downloads-list"); // richlistbox
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        FoneraDLManager.drawDownloads(dialog);
        FoneraDLManager.stripeifyList(dialog);
        FoneraDLManager.stopThrobbler();
    },

    refreshAction : function() {
        FoneraDLManager.startThrobbler();
        Fonera.checkDisks();
        FoneraDownloader.checkDownloads();
        FoneraDLManager.checkStatus();
    },

    stripeifyList : function(list) {
        let style = "display:-moz-grid-line; -moz-box-orient:horizontal; padding: 10px;";
        let item = list.firstChild;
        let i = 0;
        while (item) {
            if (item != list.selectedItem && (i % 2) != 0)
                item.setAttribute("style", style + " background-color: Lavender;");
            else
                item.setAttribute("style", style);
            i++;
            item = item.nextSibling;
        }
    },

    clearCompleted : function() {
        FoneraDLManager.startThrobbler();
        FoneraDownloader.deleteCompletedDownloads();
        // Force UI update:
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
        if (button == 0)
            FoneraDLManager.showDownloadsWindow();

    },

    loadEvents : function() {
        Fonera.addEventListener("onCheckFoneraAvailable", FoneraDLManager.checkStatus);
        FoneraDownloader.addEventListener("onDownloadsAvailable", FoneraDLManager.drawItems);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onCheckFoneraAvailable", FoneraDLManager.checkStatus);
        FoneraDownloader.removeEventListener("onDownloadsAvailable", FoneraDLManager.drawItems);
    }
};
