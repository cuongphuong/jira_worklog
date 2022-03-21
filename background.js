/*global chrome*/

chrome.runtime.onMessage.addListener((request) => {
    if (request === "showOptions") {
        chrome.runtime.openOptionsPage();
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.closeThis) chrome.tabs.remove(sender.tab.id);
});