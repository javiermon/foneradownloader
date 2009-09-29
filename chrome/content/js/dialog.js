/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
/*

 foneradownloader.js : Fonera Torrent Javascript helper
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

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/downloader.js");


//let torrentDownloadObserver = {
//    observe: function (subject, topic, state) {
//	let oDownload = subject.QueryInterface(Components.interfaces.nsIDownload);
//	// get download file object
//	let oFile = oDownload.targetFile;
//
//	if (topic == "dl-done") {
//	    Fonera.sendFileToFonera(oFile);
//	}
//    }
//}

let FoneraDialog = {

    openDownloadHandlerHelper : function () {
    // adds observers to download with fonera
        if (document.getElementById('foneraDownloader-option').selected) {

            // send link directly to fonera:
            let url = dialog.mLauncher.source.spec;
            // let mimeInfo = dialog.mLauncher.MIMEInfo;
            // if (mimeInfo.MIMEType == "application/x-bittorrent")
            FoneraDownloader.sendDownloadUrlToFonera(url);
            //Fonera.sendTorrentUrlToFonera(url);
            return true;
                //// Download to tmp file and then send to fonera:
                //// download manager observer
                //let observerService = Components.classes["@mozilla.org/observer-service;1"]
                //	.getService(Components.interfaces.nsIObserverService);
                //observerService.addObserver(torrentDownloadObserver, "dl-done", false);
                ////observerService.addObserver(torrentDownloadObserver, "dl-failed", false);
                //
                //// tmp file
                //let file = Components.classes["@mozilla.org/file/directory_service;1"].
                //	getService(Components.interfaces.nsIProperties).
                //	get("TmpD", Components.interfaces.nsIFile);
                //
                //let basename = dialog.mLauncher.source.path.replace( /.*\//, "" );
                //file.append(basename);
                //file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
                //dialog.mLauncher.saveToDisk(file, false);

        } else {
            return false;
        }
    },

// FIXME: is this really needed?
//function openTorrentUnloadHandler() {
//    // called on unload on overlay. Disables observers
//    try {
//	let observerService = Components.classes["@mozilla.org/observer-service;1"]
//	    .getService(Components.interfaces.nsIObserverService);
//	// observerService.removeObserver(torrentDownloadObserver, "dl-done");
//	//observerService.removeObserver(torrentDownloadObserver, "dl-failed");
//    } catch (e) {
//	// alert(e);
//    }
//
//}

    openDownloaderHandler : function() {
        // launched by unknownContentType load event
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (Fonera.authenticated(authToken) && Fonera.hasDisk())
            document.getElementById("foneraDownloader-option").disabled = false;
        else
            document.getElementById("foneraDownloader-option").disabled = true;

        // Set OnDialogAccept Handler
        let oDialog = document.getElementById("unknownContentType");
        oDialog.setAttribute("ondialogaccept", "if (FoneraDialog.openDownloadHandlerHelper()) return true;"
                             + oDialog.getAttribute("ondialogaccept"));
    }

};

