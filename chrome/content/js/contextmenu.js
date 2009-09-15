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

let FoneraCxtxtMenu = {

    parsedUrls : [],

    init: function () {
        let contextMenu = document.getElementById("contentAreaContextMenu");
        if (contextMenu)
            contextMenu.addEventListener("popupshowing", this.showHideItems, false);
    },

    parseSelectedText: function () {
        // http://snippets.dzone.com/posts/show/452
        let urlRegexp = /http:\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        // let urlRegexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;

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
        let showSeparator = document.getElementById("send-link-to-fonera-separator");
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken) && Fonera.hasDisk()) {
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
        }
        show.hidden = hide;
        showSeparator.hidden = hide;
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
                if (href.replace( /.*\//, "" ).lastIndexOf(".torrent") != -1)
                    FoneraDownloader.sendTorrentUrlToFonera(href);
                else
                    FoneraDownloader.sendDownloadUrlToFonera(href);
            }
        } catch (e) {
            Application.console.log("send link failed :" + e);
        }
    }
};

