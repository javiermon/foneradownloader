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
Components.utils.import("resource://modules/format.js");
Components.utils.import("resource://modules/downloader.js");


// The Download Manager Window
let FoneraLinkManager = {

    links : "FONERAPAGELINKS",

    listStyle : "display:-moz-grid-line; -moz-box-orient:horizontal; padding: 4px;",

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
        let links = Fonera.Application.storage.get(FoneraLinkManager.links, []);
        FoneraLinkManager.drawLinksList(links);
    },

    drawLinksList : function(links) {
        let dialog = document.getElementById("foneradownloader-link-list"); // richlistbox

        // remove childs
        while (dialog.hasChildNodes()) {
            dialog.removeChild(dialog.firstChild);
        }

        if (links.length == 0) {
            let dl = document.createElement("richlistitem");
            let stringsBundle = document.getElementById("string-bundle");
            let item = document.createElement("description");
            let image = document.createElement("image");
            let icon = "chrome://foneradownloader/skin/context.png";
            item.appendChild(document.createTextNode(stringsBundle.getString("noLinksFound")));
            image.setAttribute("src",icon);

            dl.insertBefore(item, dl.firstChild);
            dl.insertBefore(image, dl.firstChild);
            dialog.insertBefore(dl, dialog.firstChild);
        } else {
            let urlRegexp = FoneraDownloader.urlRegexp;
            for (let i in links) {
                if (urlRegexp.test(links[i])) {
                    let dl = document.createElement("richlistitem");
                    let item = document.createElement("checkbox");

                    let extension = links[i].substring(links[i].lastIndexOf("."),
                                                          links[i].length);

                    let icon = (extension != "") ? "moz-icon://" + extension + "?size=16" : "moz-icon://.file?size=16";
                    item.setAttribute("src",icon);

                    item.setAttribute("label", links[i]);
                    dl.insertBefore(item, dl.firstChild);
                    dialog.insertBefore(dl, dialog.firstChild);
                }
            }
        }
        FoneraFormat.stripeifyList(dialog, FoneraLinkManager.listStyle);
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
        let selectedLinks = [];

        // get selected links:
        for (let i in links) {
            let link = links[i].firstChild;
            if (link.checked) {
                selectedLinks.push(i);
                selected = true;
            }
        }

        let dontUpdateUI = true;
        while (selectedLinks.length > 0) {
            let linki = selectedLinks.pop();
            let link = links[linki].firstChild;
            dontUpdateUI = (selectedLinks.length != 0);
            FoneraDownloader.sendDownloadUrlToFonera(link.label, dontUpdateUI);
        }


        if (!selected) {
            let stringsBundle = document.getElementById("string-bundle");
            let msg = stringsBundle.getString("noLinksSelected");
            let name = stringsBundle.getString("error");

            let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                .getService(Components.interfaces.nsIPromptService);
            prompts.alert(window, name, msg);
            return;
        } else {
            Fonera.checkFoneraAvailable();
            // FIXME: this doesn't seem to check anything?
            // FoneraDownloader.checkDownloads();
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

    quickFilter : function() {
        let PreferencesBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("extensions.foneradownloader.");
        
        let filters = {
            "images": PreferencesBranch.getCharPref("filters.images"),
            "movies": PreferencesBranch.getCharPref("filters.movies"),
            "music": PreferencesBranch.getCharPref("filters.music"),
            "torrents": PreferencesBranch.getCharPref("filters.torrents"),
            "megaupload": PreferencesBranch.getCharPref("filters.megaupload"),
            "rapidshare": PreferencesBranch.getCharPref("filters.rapidshare")
        };

        let myFilter = "";
        // magic id:
        for (let type in filters) {
            let toolbarbutton = document.getElementById(type + '-quickfilter');
            if (toolbarbutton.checked) {
                if (myFilter == "") // first iteration: avoid creating a | empty
                    myFilter = filters[type];
                else
                    myFilter = filters[type] + "|" + myFilter;
            }
        }
        if (myFilter != "") {
            Fonera.Application.console.log("toolbar filter: " + myFilter);
            this.filterLinks(myFilter, false);
        }
    },

    filterLinksAction : function() {
        this.drawLinks();
        this.quickFilter();
        let filter = document.getElementById("filterTxt").value;
        this.filterLinks(filter, true);
    },

    filterLinks : function(filter, hide) {
        //
        // <richlistbox>
        //   <richlistitem>
        //    <checkbox>
        //   <richlistitem/>
        //  ...
        // <richlistbox/>
        //
        // always redraw since the textbox filters oninput!
        // this.drawLinks();
        let dialog = document.getElementById("foneradownloader-link-list");
        let links = dialog.children;
        if (filter == "") {
            return;
        } else {
            try {
                // case insensitive:
                filter = new RegExp(filter,'i');
            } catch (e) {
                Fonera.Application.console.log("could not parse filter: " + filter);
                return;
            }

            Fonera.Application.console.log("Filter: " + filter);
            let filtered = false;
            for (let i in links) {
                let item = links[i].firstChild;
                if (filter.test(item.label)) {
                    item.checked = true;
                    filtered = true;
                } else {
                    if (hide) // remove from dialog to actually filter
                        dialog.removeChild(links[i]);
                }
            }
            if (!filtered && hide)
                this.drawLinksList([]);
        }
        FoneraFormat.stripeifyList(dialog, FoneraLinkManager.listStyle);
    },

    loadEvents : function() {

    },

    unloadEvents : function() {

    }
};
