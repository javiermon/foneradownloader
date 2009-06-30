/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 accprefs.js : Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraAccountsPrefs"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

let PreferencesBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("extensions.foneradownloader.");

Components.utils.import("resource://modules/fonera.js");

let FoneraAccountsPrefs = {

    //switchAccount : function (accountName) {
    //    if (accountName != null) {
    //        document.getElementById("account-username").preference = "foneradownloader-" + accountName.value + "-username";
    //        document.getElementById("account-password").preference = "foneradownloader-" + accountName.value + "-password";
    //        // Refresh textboxes
    //        document.getElementById("account-username").value = PreferencesBranch.getCharPref(accountName.value + "username");
    //        document.getElementById("account-password").value = PreferencesBranch.getCharPref(accountName.value + "password");
    //    }
    //},

    fillAccountsIntoTree : function () {
        let accounts = Application.storage.get(Fonera.ACCOUNTS,[]);
        let tree = document.getElementById("accounts-list-items");

        for (let i in accounts) {
            let treeItem = document.createElement("treeitem");
            let treeCellType = document.createElement("treecell");
            let treeCellUname = document.createElement("treecell");
            let treeRow = document.createElement("treerow");

            Application.console.log(accounts[i].service + " - " + accounts[i].uname);
            treeCellType.setAttribute("label", accounts[i].service);
            treeCellUname.setAttribute("label", accounts[i].uname);

            treeRow.appendChild(treeCellType);
            treeRow.appendChild(treeCellUname);

            treeItem.appendChild(treeRow);
            tree.appendChild(treeItem);
        }
        tree.setAttribute("rows", accounts.length);
        FoneraAccountsPrefs.stopThrobbler();
    },

    startThrobbler : function() {
        document.getElementById("status-throbbler").src = "chrome://global/skin/icons/loading_16.png";
    },

    stopThrobbler : function() {
        document.getElementById("status-throbbler").src = "chrome://global/skin/icons/notloading_16.png";
    },

    addAccountCallback : function () {
        let stringsBundle = document.getElementById("string-bundle");
        FoneraAccountsPrefs.stopThrobbler();
        let msglabel = document.getElementById("status-messages-text");
        let errors = Application.storage.get(Fonera.LASTERROR, "");
        Application.console.log("lastError: " + errors);
        if (errors == Fonera.ACCOUNTERROR)
            msglabel.value = stringsBundle.getString(errors);
        else
            msglabel.value = "";

    },

    addAccount : function () {
        this.startThrobbler();
        let stringsBundle = document.getElementById("string-bundle");
        let msglabel = document.getElementById("status-messages-text");
        msglabel.value = stringsBundle.getString("addingAccount");
        let username = document.getElementById("account-username").value;
        let password = document.getElementById("account-password").value;
        let accountsList = document.getElementById("accounts-names");
        let provider = accountsList.getItemAtIndex(accountsList.selectedIndex).value;
        Fonera.addAccount(provider, username, password);
    },

    loadEvents : function() {
        Fonera.addEventListener("onAccountsUpdates", FoneraAccountsPrefs.addAccountCallback);
    },

    unloadEvents : function() {
        Fonera.removeEventListener("onAccountsUpdates", FoneraAccountsPrefs.addAccountCallback);
    }

};

