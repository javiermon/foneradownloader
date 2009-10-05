/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 contextmenu.js : Fonera Javascript helper
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

// https://developer.mozilla.org/En/XUL/PopupGuide/Extensions

let EXPORTED_SYMBOLS = ["FoneraCxtxtMenu"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/downloader.js");
Components.utils.import("resource://modules/linkmanager.js");

let FoneraCxtxtMenu = {

    parsedUrls : [],

    init: function () {
        let contextMenu = document.getElementById("contentAreaContextMenu");
        if (contextMenu)
            contextMenu.addEventListener("popupshowing", this.showHideItems, false);
    },

    parseSelectedText: function () {
        // http://snippets.dzone.com/posts/show/452
        let urlRegexp = FoneraDownloader.urlRegexp;

        let text = document.commandDispatcher.focusedWindow.getSelection();
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

    showHideItems : function (event) {
        let hide = true;
        let show = document.getElementById("send-link-to-fonera");
        let links = document.getElementById("get-links-for-fonera");
        let showSeparator = document.getElementById("send-link-to-fonera-separator");
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken) && Fonera.hasDisk()) {
            // we want this option visible:
            links.hidden = false;
            showSeparator.hidden = false;
            FoneraCxtxtMenu.parsedUrls = FoneraCxtxtMenu.parseSelectedText();
            try {
                if (FoneraCxtxtMenu.parsedUrls.length != 0) {
                    hide = false;
                } else if (gContextMenu.onLink) {
                    // check if it's a link, if it is, unhide
                    hide = false;
                /* youtube hack:
                 *  } else if (gBrowser.currentURI.spec.match(/http:\/\/[a-zA-Z\.]*youtube\.com\/watch/)) {
                    // http://forums.mozillazine.org/viewtopic.php?f=19&t=907465
                    let contentWinWrapper = new XPCNativeWrapper(content, "document").document.defaultView;
                    contentWinWrapper = new XPCSafeJSObjectWrapper(contentWinWrapper.wrappedJSObject);
                    let swfArgs = contentWinWrapper['swfArgs'];
                    let isHDAvailable = contentWinWrapper['isHDAvailable'];
                    if (swfArgs != null && isHDAvailable != null) {
                        // http://googlesystem.blogspot.com/2008/04/download-youtube-videos-as-mp4-files.html
                        let youtubeLink = 'http://www.youtube.com/get_video?fmt='+(isHDAvailable?'22':'18')+'&video_id='+swfArgs['video_id']+'&t='+swfArgs['t'];;

                        Application.console.log("Found Youtube link: " + youtubeLink);
                        FoneraCxtxtMenu.parsedUrls = [youtubeLink];
                        hide = false;
                    } */
                }
            } catch (e) {
                Application.console.log("showHideItem failed :" + e);
            }
        } else {
            links.hidden = true;
            showSeparator.hidden = true;
        }
        show.hidden = hide;
    },

    getLinksForFonera: function() {
        try {

            let unique = function(a) {
                tmp = new Array(0);
                for (i=0;i<a.length;i++) {
                    if (!contains(tmp, a[i])) {
                        tmp.length+=1;
                        tmp[tmp.length-1]=a[i];
                    }
                }
                return tmp;
            };

            let contains = function(a, e) {
                for (j=0;j<a.length;j++) if (a[j]==e) return true;
                return false;
            };

            let links = [];
            let pageLinks = gBrowser.selectedBrowser.contentDocument.links;
            for (let i in pageLinks)
                links.push(pageLinks[i].href);

            let images = gBrowser.selectedBrowser.contentDocument.images;
            for (let i in images)
                links.push(images[i].src);

            // remove duplicates
            links = unique(links);
            Application.console.log("found " + links.length + " links");
            Application.storage.set(FoneraLinkManager.links, links);
            FoneraLinkManager.showLinksWindow();
        } catch (e) {
            Application.console.log("Error finding links in page: " + e);
        }
    },

    sendLinkToFonera: function () {
        try {
            if (FoneraCxtxtMenu.parsedUrls.length != 0) {
                for (let i in FoneraCxtxtMenu.parsedUrls) {
                    let url = FoneraCxtxtMenu.parsedUrls[i];
                    FoneraDownloader.sendDownloadUrlToFonera(url);
                }
            } else {
                // http://www.sitepoint.com/blogs/2007/08/10/dealing-with-unqualified-href-values/
                let href = document.popupNode.href;
                FoneraDownloader.sendDownloadUrlToFonera(href);
            }
        } catch (e) {
            Application.console.log("send link failed :" + e);
        }
    }
};

