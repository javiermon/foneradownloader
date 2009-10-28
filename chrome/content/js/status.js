/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 fonerastatus.js : Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraStatus"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

let Preferences = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/downloader.js");

// STATUSBAR
let FoneraStatus = {

    drawTooltip : function() {
        let stringsBundle = document.getElementById("string-bundle");
        let panel = document.getElementById('foneraDownloader-sbpanel');
        let clearErrorItem = document.getElementById("foneradownloader-sbpanel-clearerrors");
        clearErrorItem.setAttribute('hidden', true);

        if (!Fonera.isPluginEnabled()) {
            panel.tooltipText = stringsBundle.getString('disabledString');
            panel.src = "chrome://foneradownloader/skin/disabled.png";
            return;
        }

        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        if (authToken == Fonera.authFailed) {
            Application.console.log("Authentication failed!\n");
            // TODO: style="color: red;""
            panel.tooltipText = stringsBundle.getString('authFailString');
            panel.src = "chrome://global/skin/icons/warning-16.png";
            return;
        } else if (authToken == Fonera.authError) {
            panel.tooltipText = stringsBundle.getString('authErrorString');
            panel.src = "chrome://global/skin/icons/error-16.png";
            return;
        } else if (authToken == null) {
            Application.console.log("Waiting for authentication!\n");
            panel.tooltipText = stringsBundle.getString('foneraloading');
            panel.src = "chrome://global/skin/icons/loading_16.png";
            return;
        }
        // check disks:
        if (!Fonera.hasDisk()) {
            panel.tooltipText = stringsBundle.getString('noDiskErrorString');
            panel.src = "chrome://global/skin/icons/warning-16.png";
            return;
        }
        // check errors:
        let errors = Application.storage.get(Fonera.LASTERROR, null);
        if (errors != null) {
            Application.console.log("status found error: " + errors);
            clearErrorItem.setAttribute('hidden', false);
            panel.src = "chrome://global/skin/icons/warning-16.png";
            panel.tooltipText = FoneraDownloader.getErrorString(errors, stringsBundle);
            return;
        }
        // everything fine:
        panel.src = "chrome://foneradownloader/skin/information.png";
        let foneraStatus = document.getElementById("foneraDownloader-sbpanel");
        let foneradownloads = Application.storage.get(FoneraDownloader.FONERADOWNLOADS, []);
        let torrents = Application.storage.get(FoneraDownloader.FONERATORRENTS, []);

        let totaldownloads = foneradownloads.length + torrents.length;
        if (totaldownloads == 0)
            foneraStatus.tooltipText = stringsBundle.getString('noFilesFound');
        else
            foneraStatus.tooltipText = totaldownloads + " " + stringsBundle.getString('totaldownloads');
    },

    clearError : function() {
        Application.storage.set(Fonera.LASTERROR, null);
        // propagate updates:
        Fonera.checkFoneraAvailable();
    },

    showPreferences : function() {
        let features = "chrome,titlebar,toolbar,centerscreen,modal";
        window.openDialog("chrome://foneradownloader/content/options.xul", "Preferences", features);
    },

    loadEvents : function() {
        FoneraDownloader.addEventListener("onDownloadsAvailable", FoneraStatus.drawTooltip);
        Fonera.addEventListener("onCheckFoneraAvailable", FoneraStatus.drawTooltip);
        Fonera.addEventListener("onSendUrl", FoneraStatus.drawTooltip);
    },

    unloadEvents : function() {
        FoneraDownloader.removeEventListener("onDownloadsAvailable", FoneraStatus.drawTooltip);
        Fonera.removeEventListener("onCheckFoneraAvailable", FoneraStatus.drawTooltip);
        Fonera.removeEventListener("onSendUrl", FoneraStatus.drawTooltip);
    }

};