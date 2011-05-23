/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 preferences.js : Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraPrefs"];

Components.utils.import("resource://jsmodules/fonera.js");

let FoneraPrefs = {

    applyAction : function () {
        try {
            let PreferencesBranch = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService).getBranch("extensions.foneradownloader.");


            let nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                Components.interfaces.nsILoginInfo,
                "init");
            
            let passwordManager = Components.classes["@mozilla.org/login-manager;1"].
                getService(Components.interfaces.nsILoginManager);


            let password = document.getElementById("password");
            let foneraip = document.getElementById("foneraip");
            PreferencesBranch.setCharPref("foneraip", foneraip.value);

            let onwan = document.getElementById("onwan");
            PreferencesBranch.setBoolPref("onwan", onwan.checked);

            let enabled = document.getElementById("enabled");
            PreferencesBranch.setBoolPref("enabled", enabled.checked);

            if (password.value != null && password.value != "") {
                let extLoginInfo = new nsLoginInfo('chrome://foneradownloader',
                    null, 'Fonera user Login',
                    Fonera.getUsername(), password.value, "", "");

                // remove all logins and create a new one:
                let logins = passwordManager.findLogins({}, 'chrome://foneradownloader', null, 'Fonera user Login');
                for (let i = 0; i < logins.length; i++) {
                    passwordManager.removeLogin(logins[i]);
                }
                passwordManager.addLogin(extLoginInfo);
            }

            Fonera.checkFoneraAvailable(true);

        } catch(e) {
            Fonera.Application.console.log(e);
        }

    },

    loadValues : function () {
        try {

            let PreferencesBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("extensions.foneradownloader.");

            let password = document.getElementById("password");
            password.value = Fonera.getPassword();

            let foneraip = document.getElementById("foneraip");
            foneraip.value = PreferencesBranch.getCharPref("foneraip");

            let onwan = document.getElementById("onwan");
            onwan.checked = PreferencesBranch.getBoolPref("onwan");

            let enabled = document.getElementById("enabled");
            enabled.checked = PreferencesBranch.getBoolPref("enabled");

        } catch(e) {
            Fonera.Application.console.log(e);
        }

    },

    loadEvents : function() {

    },

    unloadEvents : function() {

    }

};

