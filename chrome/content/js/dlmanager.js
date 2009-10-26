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

let Preferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/downloader.js");
Components.utils.import("resource://modules/format.js");

const styleB12C = "font-style: bold; font-size: 1.2em; text-align: center;";
const styleDMGLH = "display:-moz-grid-line; -moz-box-orient:horizontal";
const styleC200 = "text-align: center; min-width: 200px;";
const style15I09 = "margin-left:15px; font-style: italic; font-size: 0.9em;";
const style09r55 = "font-size: 0.9em; text-align: right; min-width: 55px;";
const style09r40 = "font-size: 0.9em; text-align: right; min-width: 40px;";

const listStyle = "display:-moz-grid-line; -moz-box-orient:horizontal; padding: 10px;";
const listStyleSmall = "display:-moz-grid-line; -moz-box-orient:horizontal; padding: 6px;";
const miniActionButtons = "list-style-image: url('chrome://foneradownloader/skin/downloadButtons.png'); ";
const playActionOffset = "-moz-image-region: rect(0px, 16px, 16px, 0px);";
const pauseActionOffset = "-moz-image-region: rect(0px, 48px, 16px, 32px);";
const cancelActionOffset = "-moz-image-region: rect(0px, 32px, 16px, 16px);";

// The Download Manager Window
let FoneraDLManager = {

    drawDownloadItemSmall : function(downloadItem, dl, stringsBundle) {
        let item = document.createElement("label");
        let image = document.createElement("image");
        let extension = downloadItem.file.substring(downloadItem.file.lastIndexOf("."),
                                                          downloadItem.file.length);

        let icon = (extension != "") ? "moz-icon://" + extension + "?size=16" : "moz-icon://.file?size=16";
        image.setAttribute("src", icon);
        item.setAttribute("value", downloadItem.file);
        item.setAttribute("style", "font-size: 0.9em;");
        let space = document.createElement("spacer");
        space.setAttribute("flex","1");

        let statusString = document.createElement("label");
        statusString.setAttribute("value", FoneraFormat.stateName(downloadItem.status));
        statusString.setAttribute("style", style09r55
                                  + "color: " + FoneraFormat.colorPicker(downloadItem.status) + ";");

        let sizeString = document.createElement("label");
        sizeString.setAttribute("value", FoneraFormat.bytesToSize(downloadItem.size, 2));
        sizeString.setAttribute("style", style09r55);

        let dwSize = document.createElement("label");
        dwSize.setAttribute("value", downloadItem.downloaded);
        dwSize.setAttribute("style", style09r40);

        dl.insertBefore(dwSize, dl.firstChild);
        dl.insertBefore(sizeString, dl.firstChild);
        dl.insertBefore(statusString, dl.firstChild);
        dl.insertBefore(space, dl.firstChild);
        dl.insertBefore(item, dl.firstChild);
        dl.insertBefore(image, dl.firstChild);
        // rightclick:
        let id = downloadItem.id;
        let context = document.createElement('popupset');
        let contextmenupopup = document.createElement('menupopup');
        contextmenupopup.setAttribute('id', 'cxtpopup-' + id);
        context.insertBefore(contextmenupopup, context.firstChild);

        if (downloadItem.status == "load") {
            let menuPause = document.createElement('menuitem');
            menuPause.setAttribute('label', stringsBundle.getString("pause"));
            menuPause.setAttribute('oncommand', "FoneraDLManager.downloadAction('" + downloadItem.id + "', 'pause')");
            menuPause.setAttribute('class', 'menuitem-iconic');
            menuPause.setAttribute("style",
                           miniActionButtons
                           + pauseActionOffset);
            contextmenupopup.insertBefore(menuPause, contextmenupopup.firstChild);
        } else if (downloadItem.status != "done" && downloadItem.status != "hashing") {
            let menuPlay = document.createElement('menuitem');
            menuPlay.setAttribute('label', stringsBundle.getString("start"));
            menuPlay.setAttribute('oncommand', "FoneraDLManager.downloadAction('" + downloadItem.id + "', 'start')");
            menuPlay.setAttribute('class', 'menuitem-iconic');
            menuPlay.setAttribute("style",
                           miniActionButtons
                           + playActionOffset);
            contextmenupopup.insertBefore(menuPlay, contextmenupopup.firstChild);
        }

        let menuCancel = document.createElement('menuitem');
        menuCancel.setAttribute('label', stringsBundle.getString("cancel"));
        menuCancel.setAttribute('oncommand', "FoneraDLManager.downloadAction('" + downloadItem.id + "', 'delete')");
        menuCancel.setAttribute('class', 'menuitem-iconic');
        menuCancel.setAttribute("style",
                           miniActionButtons
                             + cancelActionOffset);
        // we want this action to be the last one:
        contextmenupopup.appendChild(menuCancel);

        dl.setAttribute('context', 'cxtpopup-' + id);
        dl.insertBefore(context, dl.firstChild);
        let tooltip = FoneraDLManager.drawDownloadTooltip(downloadItem);
        dl.setAttribute("tooltip", tooltip.id);
        dl.insertBefore(tooltip, dl.firstChild);
    },

    drawDownloadTooltip : function(downloadItem) {
        let tooltip = document.createElement("tooltip");
        let tooltipName = document.createElement("description");
        tooltipName.setAttribute("value", downloadItem.file);
        tooltip.appendChild(tooltipName);

        let dlMore = downloadItem.moreinfo;
        for (let x in dlMore) {
            let tooltipMore = document.createElement("description");
            tooltipMore.setAttribute("value", dlMore[x]);
            tooltip.appendChild(tooltipMore);
        }

        let tooltipId = 'tooltip' + downloadItem.id;
        tooltip.setAttribute("id", tooltipId);
        return tooltip;
    },

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
        let tooltip = FoneraDLManager.drawDownloadTooltip(downloadItem);
        image.setAttribute("tooltip", tooltip.id);
        vboxImage.insertBefore(image,vboxImage.firstChild);
        vboxImage.insertBefore(tooltip,vboxImage.firstChild);

        // DATA
        let vboxData = document.createElement("vbox");
        vboxData.setAttribute("style", styleC200);
        // name
        let hboxName = document.createElement("hbox");
        hboxName.setAttribute("flex", "1");
        let description = document.createElement("description");

        description.appendChild(document.createTextNode(dlName));
        description.setAttribute("style", styleB12C);
        hboxName.insertBefore(description, hboxName.firstChild);
        // data
        let hboxData = document.createElement("hbox");
        hboxData.setAttribute("style",styleDMGLH);
        let type = document.createElement("label");
        type.setAttribute("value", stringsBundle.getString('type'));
        type.setAttribute("style", style15I09);

        let typeString = document.createElement("label");
        typeString.setAttribute("value", stringsBundle.getString(downloadItem.type));
        typeString.setAttribute("style", "font-size: 0.9em;");

        let status = document.createElement("label");
        status.setAttribute("value", stringsBundle.getString('status'));
        status.setAttribute("style", style15I09);

        let statusString = document.createElement("label");
        statusString.setAttribute("value", FoneraFormat.stateName(downloadItem.status));
        statusString.setAttribute("style", "font-size: 0.9em; "
                                  + "color: " + FoneraFormat.colorPicker(downloadItem.status) + ";");

        let size = document.createElement("label");
        size.setAttribute("value", stringsBundle.getString('size'));
        size.setAttribute("style", style15I09);

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

        if (downloadItem.status == "load") {
            action = "pause";
            playb.setAttribute("style",
                           miniActionButtons
                           + pauseActionOffset);
            playb.tooltipText = stringsBundle.getString("pause");
        } else if (downloadItem.status != "done" && downloadItem.status != "hashing") {
            action = "start";
            playb.setAttribute("style",
                           miniActionButtons
                           + playActionOffset);
            playb.tooltipText = stringsBundle.getString("start");
        } else {
            playb.setAttribute("style","");
        }
        playb.setAttribute("onclick","FoneraDLManager.downloadAction('" + downloadItem.id + "','" + action  + "')");

        let cancelb = document.createElement("image");
        cancelb.setAttribute("style",
                           miniActionButtons
                             + cancelActionOffset);

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

    toggleListView : function() {
        let filters = {
            'icon-view' : listStyle,
            'list-view' : listStyleSmall
        };
        let children = document.getElementById("filter-toolbar").childNodes;
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        let filter = prefs.getCharPref('dlview');
        for (let i = 0; i < children.length; i++) {
            try {
                if (children[i].type == 'radio' && children[i].checked && children[i].group == 'ViewGroup') {
                    filter = children[i].id;
                }
            } catch (e) {
                Application.console.log(e);
            }
        };
        // re-set
        Application.console.log(filters[filter] + " selected");
        prefs.setCharPref('dlview', filter);
        return filters[filter];
    },

    checkStatus : function() {
        FoneraDLManager.startThrobbler();
        
        FoneraDLManager.drawErrors();

        let stringsBundle = document.getElementById("string-bundle");
        let text = stringsBundle.getString('loading') + "...";
        let icon = "chrome://global/skin/icons/loading_16.png";

        if (!Fonera.isPluginEnabled()) {
            text = stringsBundle.getString('disabledString');
            icon = "chrome://foneradownloader/skin/disabled.png";
        } else {
            FoneraDLManager.toggleListView();

            let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
            if (authToken == Fonera.authFailed) {
                text = stringsBundle.getString('authFailString');
                icon = "chrome://global/skin/icons/Warning.png";
                FoneraDLManager.stopThrobbler();
            } else if (authToken == Fonera.authError) {
                text = stringsBundle.getString('authErrorString');
                icon = "chrome://global/skin/icons/Error.png";
            } else if (authToken != null ) {
                Application.console.log("authenticated");
                // check disks:
                if (!Fonera.hasDisk()) {
                    Application.console.log("no disk available");
                    text = stringsBundle.getString('noDiskErrorString');
                    icon = "chrome://global/skin/icons/Warning.png";
                } else {
                    let downloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
                    let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
                    if (torrents.length == 0 && downloads.length == 0) {
                        text = stringsBundle.getString("noFilesFound");
                        icon = "chrome://foneradownloader/skin/context.png";
                    } else {
                        FoneraDLManager.drawItems();
                        FoneraDLManager.updateCounterLabels();
                        return;
                    }
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
        FoneraDLManager.updateCounterLabels();
        FoneraDLManager.stopThrobbler();
    },

    drawErrors : function() {
        let dialog = document.getElementById("foneradownloader-errors-list"); // richlistbox
        let errors = Application.storage.get(Fonera.LASTERROR, null);
        if (errors == null) {
            dialog.setAttribute('hidden', true);
            return;
        }
        let stringsBundle = document.getElementById("string-bundle");
        dialog.setAttribute('hidden', false);
        Application.console.log("Last error found " + errors);
        let icon = '';
        let errormsg = '';
        // TODO: refactor with status.js
        if (errors.match(FoneraDownloader.NOACCOUNTERROR)) {
            icon = "chrome://global/skin/icons/warning-16.png";
            let error = errors.split(":")[0];
            let domain = errors.split(":")[1];
            errormsg = stringsBundle.getString(error) + ": " + domain;
        } else if (errors != null && errors != FoneraDownloader.ACCOUNTERROR) {
            icon = "chrome://global/skin/icons/warning-16.png";
            errormsg = errors + " : "  + stringsBundle.getString('downloadFailed');
        } else {
            icon = "chrome://global/skin/icons/error-16.png";
            errormsg = stringsBundle.getString("unknownerror");
        }

        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        let ritem = document.createElement("richlistitem");
        dialog.insertBefore(ritem, dialog.firstChild);
        let vbox = document.createElement("vbox");
        let cancelb = document.createElement("image");
        cancelb.setAttribute("src", "chrome://foneradownloader/skin/disabled.png");
                           //miniActionButtons
                           //  + cancelActionOffset);
        cancelb.setAttribute("onclick","FoneraDLManager.clearErrors()");
        cancelb.tooltipText = stringsBundle.getString("clear");
        vbox.insertBefore(cancelb, vbox.firstChild);
        ritem.insertBefore(vbox, ritem.firstChild);
        FoneraDLManager.drawStatusItem(ritem, icon, errormsg);
        FoneraDLManager.stripeifyList(dialog);
    },

    clearErrors : function() {
        Application.storage.set(Fonera.LASTERROR, null);
        let dialog = document.getElementById("foneradownloader-errors-list"); // richlistbox
        dialog.setAttribute('hidden', true);
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
        hboxName.setAttribute("style", styleC200);
        let description = document.createElement("description");

        description.appendChild(document.createTextNode(dlName));
        description.setAttribute("style", styleB12C);
        let space = document.createElement("spacer");
        hboxName.insertBefore(space, hboxName.firstChild);
        hboxName.insertBefore(description, hboxName.firstChild);

        dl.insertBefore(hboxName,dl.firstChild);
        dl.insertBefore(vboxImage,dl.firstChild);
    },

    drawDownloads : function(dialog, filter) {
        // FIXME: move styling to css
        // Example: http://www.nexgenmedia.net/mozilla/richlistbox/richlistbox-simple.xul
        let foneraDownloads = [];
        if (filter == 'filter-all') {
            foneraDownloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
            let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
            foneraDownloads = foneraDownloads.concat(torrents);
        } else if (filter == 'filter-torrents') {
            foneraDownloads = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
        } else {
            foneraDownloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        }

        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        let filter = prefs.getCharPref('dlview');
        let drawFunction = (filter == 'icon-view') ? FoneraDLManager.drawDownloadItem : FoneraDLManager.drawDownloadItemSmall;

        let stringsBundle = document.getElementById("string-bundle");

        // sort:
        let sortCriteria = prefs.getCharPref('dlsort');
        let children = document.getElementById("sort-menu").childNodes;
        for (let j = 0; j < children.length; j++) {
            try {
                // can't seem to get attributes directly from the object, need getAttribute
                if (children[j].getAttribute('type') == 'radio' && children[j].getAttribute('checked') == 'true') {
                    sortCriteria = children[j].id;
                    Application.console.log(children[j].id + " selected");
                }
            } catch (e) {
                Application.console.log(e);
            }
        };
        Application.console.log(sortCriteria + " sorting selected");
        // save status:
        prefs.setCharPref('dlsort', sortCriteria);
        let sortFunction = function (a, b) {
            if (a.status == sortCriteria) {
                if (b.status == sortCriteria)
                    return 0;
                else
                    return 1;
            } else if (a.status == b.status) {
                return 1;
            } else
                return -1;
        };

        foneraDownloads.sort(sortFunction);
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        if (foneraDownloads != null && foneraDownloads.length != 0) {
            // populate
            for (let i in foneraDownloads) {
                let dl = document.createElement("richlistitem");
                drawFunction(foneraDownloads[i], dl, stringsBundle);
                dialog.insertBefore(dl, dialog.firstChild);
            }
            // enable clear downloads
            document.getElementById("clearButton").disabled = false;
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

        let filter = 'filter-all';
        let children = document.getElementById("filter-toolbar").childNodes;
        for (let i = 0; i < children.length; i++) {
            try {
                if (children[i].type == 'radio' && children[i].checked && children[i].group == 'FilterGroup') {
                    filter = children[i].id;
                    Application.console.log(children[i].id + " selected");
                }
            } catch (e) {
                Application.console.log(e);
            }
        };
        FoneraDLManager.drawDownloads(dialog, filter);
        FoneraDLManager.stripeifyList(dialog);
        FoneraDLManager.stopThrobbler();
    },

    stripeifyList : function(dialog) {
        let style = FoneraDLManager.toggleListView(); // choose
        FoneraFormat.stripeifyList(dialog, style);
    },

    refreshAction : function() {
        FoneraDLManager.startThrobbler();
        Fonera.checkFoneraAvailable();
        FoneraDLManager.drawErrors();
        // this is called from the previous call:
        // Fonera.checkDisks();
        // FoneraDownloader.checkDownloads();
        // FoneraDLManager.checkStatus();
    },

    clearCompleted : function() {
        FoneraDLManager.startThrobbler();
        FoneraDownloader.deleteCompletedDownloads();
        // Force UI update:
        FoneraDLManager.refreshAction();
    },

    updateCounterLabels : function() {
        let allLabel = document.getElementById("filter-all");
        let downloadsLabel = document.getElementById("filter-downloads");
        let torrentsLabel = document.getElementById("filter-torrents");

        let downloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);
        let total = downloads.length + torrents.length;
        let separator = ' (';
        let close = ')';
        if (total != 0) {
            Application.console.log('Updating counters');
            allLabel.label = allLabel.label.split(separator)[0] + separator + total + close;
            downloadsLabel.label = downloadsLabel.label.split(separator)[0] + separator + downloads.length + close;
            torrentsLabel.label = torrentsLabel.label.split(separator)[0] + separator + torrents.length + close;
        } else {
            allLabel.label = allLabel.label.split(separator)[0];
            downloadsLabel.label = downloadsLabel.label.split(separator)[0];
            torrentsLabel.label = torrentsLabel.label.split(separator)[0];
        }
    },

    loadDefaults : function() {
        let prefs = Preferences.getBranch("extensions.foneradownloader."); // the final . is needed
        let sortCriteria = prefs.getCharPref('dlsort');

        let children = document.getElementById("sort-menu").childNodes;
        for (let j = 0; j < children.length; j++) {
            try {
                // can't seem to get attributes directly from the object, need getAttribute
                if (children[j].getAttribute('type') == 'radio' && children[j].id == sortCriteria) {
                    children[j].setAttribute('checked', true);
                }
            } catch (e) {
                Application.console.log(e);
            }
        }

        let view = prefs.getCharPref('dlview');
        children = document.getElementById("filter-toolbar").childNodes;
        for (let i = 0; i < children.length; i++) {
            try {
                if (children[i].type == 'radio' && children[i].group == 'ViewGroup' && children[i].id == view) {
                    children[i].checked = true;
                }
            } catch (e) {
                Application.console.log(e);
            }
        };

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
        FoneraDownloader.addEventListener("onDownloadsAvailable", FoneraDLManager.checkStatus);
        FoneraDownloader.addEventListener("onSendUrl", FoneraDLManager.checkStatus);
        FoneraDLManager.loadDefaults();
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onCheckFoneraAvailable", FoneraDLManager.checkStatus);
        FoneraDownloader.removeEventListener("onDownloadsAvailable", FoneraDLManager.checkStatus);
        FoneraDownloader.removeEventListener("onSendUrl", FoneraDLManager.checkStatus);
    }
};
