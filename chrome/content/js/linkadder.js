/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 linkadder.js : Download Manager for Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraLinkadder"];

Components.utils.import("resource://foneradjsmodules/fonera.js");
Components.utils.import("resource://foneradjsmodules/downloader.js");

let FoneraLinkadder = {

    parseLinks : function() {
        let text = document.getElementById('foneradownloader-link-text').value;
        Fonera.Application.console.log("parsed: " + text);
        let urlRegexp = FoneraDownloader.urlRegexp;

        let matches = [];
        if (text == null)
            return matches;
        text = text.toString();
        let lines = text.split('\n');
        for (let i in lines) {
            let line = lines[i];
            if (urlRegexp.test(line)) {
                matches.push(line);
            }
        }
        return matches;
    },

    sendLinksToFonera: function () {
        try {
            let links = FoneraLinkadder.parseLinks();
            if (links.length != 0) {
                for (let i in links) {
                    let url = links[i];
                    FoneraDownloader.sendDownloadUrlToFonera(url);
                }

                let name = "chrome://foneradownloader/content/linkadder.xul";
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
            } else {
                let stringsBundle = document.getElementById("string-bundle");
                let msg = stringsBundle.getString("noLinksTyped");
                let name = stringsBundle.getString("error");

                let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                      .getService(Components.interfaces.nsIPromptService);
                prompts.alert(window, name, msg);
                return;
            }
        } catch (e) {
            Fonera.Application.console.log("send link failed :" + e);
        }
    },

    loadEvents : function() {

    },

    unloadEvents : function() {

    }
};
