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
Components.utils.import("resource://modules/downloader.js");

let FoneraAccountsPrefs = {

    fillAccountsIntoTree : function () {
        let accounts = Application.storage.get(FoneraDownloader.ACCOUNTS,[]);
        let tree = document.getElementById("accounts-list-items");

        while (tree.hasChildNodes()) {
            tree.removeChild(tree.firstChild);
        }

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
        FoneraAccountsPrefs.stopThrobbler();
    },

    startThrobbler : function() {
        document.getElementById("status-throbbler").src = "chrome://global/skin/icons/loading_16.png";
    },

    stopThrobbler : function() {
        document.getElementById("status-throbbler").src = "chrome://global/skin/icons/notloading_16.png";
    },

    actionOnAccountCallback : function () {
        let stringsBundle = document.getElementById("string-bundle");
        FoneraAccountsPrefs.stopThrobbler();
        let msglabel = document.getElementById("status-messages-text");
        let errors = Application.storage.get(FoneraDownloader.ACCOUNTERROR, null);
        Application.console.log("lastError: " + errors);
        if ((errors == FoneraDownloader.ACCOUNTERROR) || (errors == FoneraDownloader.ACCOUNTDELERROR))
            msglabel.value = stringsBundle.getString(errors);
        else
            msglabel.value = "";
        Application.storage.set(Fonera.LASTERROR, null);
        FoneraAccountsPrefs.fillAccountsIntoTree();
    },

    addAccount : function () {
        let username = document.getElementById("account-username").value;
        let password = document.getElementById("account-password").value;
        // empty labels seem to appear with "" as the default text
        if ((username != "") && (password != "")) {
            this.startThrobbler();
            Application.storage.set(FoneraDownloader.ACCOUNTERROR, null);
            let stringsBundle = document.getElementById("string-bundle");
            let msglabel = document.getElementById("status-messages-text");
            msglabel.value = stringsBundle.getString("addingAccount");

            let accountsList = document.getElementById("accounts-names");
            let provider = accountsList.getItemAtIndex(accountsList.selectedIndex).value;
            FoneraDownloader.addAccount(provider, username, password);
        }
    },

    deleteAccount : function () {
        let tree = document.getElementById("accounts-tree");
        let index = tree.currentIndex;
        if (index == -1)
            return;
        Application.storage.set(FoneraDownloader.ACCOUNTERROR, null);
        let selection = tree.view.selection;
        let cellType = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(0));
        let cellUname = tree.view.getCellText(tree.currentIndex, tree.columns.getColumnAt(1));
        // find the id of the username/domain:
        let accounts = Application.storage.get(FoneraDownloader.ACCOUNTS, []);
        for (let i in accounts) {
            if ((accounts[i].service == cellType) && (accounts[i].uname == cellUname))
                FoneraDownloader.deleteAccount(accounts[i].id);
        }
        this.startThrobbler();
        let msglabel = document.getElementById("status-messages-text");
        let stringsBundle = document.getElementById("string-bundle");
        msglabel.value = stringsBundle.getString("deletingAccount");

    },

    enableAccountManager : function () {
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let disabled = !Fonera.authenticated(authToken);
        if (disabled) {
            let tree = document.getElementById("accounts-list-items");
            while (tree.hasChildNodes()) {
                tree.removeChild(tree.firstChild);
            }
        }

        document.getElementById("accounts-tree").disabled = disabled;
        document.getElementById("accounts-names").disabled = disabled;
        document.getElementById("account-username").disabled = disabled;
        document.getElementById("account-password").disabled = disabled;
        document.getElementById("submit-account").disabled = disabled;
        document.getElementById("delete-account").disabled = disabled;
    },

    loadEvents : function() {
        Application.storage.set(FoneraDownloader.ACCOUNTERROR, null);
        Fonera.addEventListener("onAuthenticate", FoneraAccountsPrefs.enableAccountManager);
        FoneraDownloader.addEventListener("onAccountsUpdates", FoneraAccountsPrefs.actionOnAccountCallback);
    },

    unloadEvents : function() {
        Application.storage.set(FoneraDownloader.ACCOUNTERROR, null);
        Fonera.removeEventListener("onAuthenticate", FoneraAccountsPrefs.enableAccountManager);
        FoneraDownloader.removeEventListener("onAccountsUpdates", FoneraAccountsPrefs.actionOnAccountCallback);
    }

};

