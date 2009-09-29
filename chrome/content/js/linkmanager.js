/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 linkmanager.js : Download Manager for Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraLinkManager"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/downloader.js");

// The Download Manager Window
let FoneraLinkManager = {

    links : "FONERAPAGELINKS",

    stripeifyList : function(list) {
        let style = "display:-moz-grid-line; -moz-box-orient:horizontal;";
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

    showLinksWindow : function() {
        if (!Fonera.isPluginEnabled())
            return;

        // https://developer.mozilla.org/en/Working_with_windows_in_chrome_code
        let name = "chrome://foneradownloader/content/linkmanager.xul";
        let type = "foneradownloader:linkmanager";
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

        // window object isn't available in this context:
        // window.open(name, "", "chrome,width=520,height=230,centerscreen,resizable=yes");
        let ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Components.interfaces.nsIWindowWatcher);
        let win = ww.openWindow(null, name,
                                "", "chrome,width=520,height=230,centerscreen,resizable=yes", null);

        return;
    },

    drawLinks : function() {
        let dialog = document.getElementById("foneradownloader-link-list"); // richlistbox
        let links = Application.storage.get(FoneraLinkManager.links, []);
        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        if (links.length == 0) {
            let dl = document.createElement("richlistitem");
            let stringsBundle = document.getElementById("string-bundle");
            let item = document.createElement("description");
            item.appendChild(document.createTextNode(stringsBundle.getString("noLinksFound")));

            dl.insertBefore(item, dl.firstChild);
            dialog.insertBefore(dl, dialog.firstChild);
        } else {
            let urlRegexp = FoneraDownloader.urlRegexp;
            for (let i in links) {
                if (urlRegexp.test(links[i].href)) {
                    let dl = document.createElement("richlistitem");
                    // checkbox | link string
                    let item = document.createElement("checkbox");
                    item.setAttribute("label", links[i]);
                    dl.insertBefore(item, dl.firstChild);
                    dialog.insertBefore(dl, dialog.firstChild);
                }
            }
        }

        FoneraLinkManager.stripeifyList(dialog);
    },

    processClick : function(event) {
        if (!Fonera.isPluginEnabled())
            return;

        let button = event.button; // 0: left 1: middle 2: right
        if (button == 0)
            FoneraLinkManager.showLinksWindow();

    },

    sendSelectedLinks: function() {
        //
        // <richlistbox>
        //   <richlistitem>
        //    <checkbox>
        //   <richlistitem/>
        //  ...
        // <richlistbox/>
        //
        let links = document.getElementById("foneradownloader-link-list").children;
        let selected = false;
        for (let i in links) {
            let link = links[i].firstChild;
            if (link.checked) {
                selected = true;
                FoneraDownloader.sendDownloadUrlToFonera(link.label);
            }
        }

        if (!selected) {
            let stringsBundle = document.getElementById("string-bundle");
            let msg = stringsBundle.getString("noLinksSelected");
            let name = stringsBundle.getString("error");

            let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
            prompts.alert(window, name, msg);
            return;
        }


        // https://developer.mozilla.org/en/Working_with_windows_in_chrome_code
        let name = "chrome://foneradownloader/content/linkmanager.xul";
        let type = "foneradownloader:linkmanager";
        let winMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator);

        // FIXME: there should be a more efficient way of doing this
        // get all windows:
        let enumerator = winMediator.getEnumerator(null);
        while (enumerator.hasMoreElements()) {
            let wmWin = enumerator.getNext();
            if (wmWin.location == name) {
                wmWin.close();
                return;
            }
        }

    },

    filterLinks : function() {
        //
        // <richlistbox>
        //   <richlistitem>
        //    <checkbox>
        //   <richlistitem/>
        //  ...
        // <richlistbox/>
        //
        let links = document.getElementById("foneradownloader-link-list").children;
        let filter = document.getElementById("filterTxt").value;
        if (filter == "") {
            for (let i in links) {
                let link = links[i].firstChild;
                link.checked = false;
            }
        } else {
            filter = new RegExp(filter);
            Application.console.log("Filter: " + filter);
            for (let i in links) {
                let link = links[i].firstChild;
                if (filter.test(link.label)) {
                    link.checked = true;
                    FoneraDownloader.sendDownloadUrlToFonera(link.label);
                }
            }
        }
    },

    loadEvents : function() {

    },

    unloadEvents : function() {

    }
};
